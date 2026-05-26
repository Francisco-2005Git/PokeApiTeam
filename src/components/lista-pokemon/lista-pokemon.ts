import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild, NgZone } from '@angular/core';
import { PokemonService } from '../../services/pokemon';
import { Router, RouterLink } from '@angular/router'; // NUEVO: Importamos Router para la búsqueda
import { NgClass, TitleCasePipe, UpperCasePipe, KeyValuePipe } from '@angular/common'; // NUEVO: Importamos KeyValuePipe
import { FormsModule } from '@angular/forms'; // NUEVO: Importamos FormsModule para el ngModel de la búsqueda
import { forkJoin, Observable } from 'rxjs';

interface GrupoEvolutivo {
  base: {
    id: number;
    nombre: string;
    imagen: string;
    tipo: string;
    urlCadena: string;
  };
  evoluciones: any[];
  visible: boolean;
  alto: number; // guardamos esto antes de quitar el elemento del dom
}

@Component({
  selector: 'app-lista-pokemon',
  // NUEVO: Agregamos FormsModule y KeyValuePipe a los imports
  imports: [RouterLink, NgClass, TitleCasePipe, UpperCasePipe, FormsModule, KeyValuePipe],
  providers: [PokemonService],
  templateUrl: './lista-pokemon.html',
  styleUrl: './lista-pokemon.css',
})
export class ListaPokemon implements OnInit, AfterViewInit, OnDestroy {

  grupos: GrupoEvolutivo[] = [];
  loading = false;
  hayMas = true;

  // NUEVO: Variables para el buscador y las generaciones
  listaPokemonCompleta: any[] = [];
  conteosGeneracion: { [key: string]: number } = {};
  terminoBusqueda: string = '';

  private offset = 0;
  private readonly LIMITE = 20;

  private yaRegistrados = new Set<number>();
  private obsCentinela!: IntersectionObserver;
  private obsVisible!: IntersectionObserver;

  @ViewChild('sentinel') centinela!: ElementRef;

  constructor(
    private pokemonService: PokemonService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router // NUEVO: Inyectamos el Router
  ) {}

  ngOnInit(): void {
    // NUEVO: Cargar la lista completa al inicio para conteos y búsqueda (hasta Paldea, ID 1025)
    this.pokemonService.getPokemonList(1025, 0).subscribe(resp => {
      // Usando un ciclo tradicional for en lugar de map/forEach para mayor claridad
      let listaTemporal = [];
      for (let i = 0; i < resp.results.length; i++) {
        listaTemporal.push({
          id: (i + 1).toString(),
          nombre: resp.results[i].name
        });
      }
      this.listaPokemonCompleta = listaTemporal;
      this.calcularConteosGeneracion();
    });

    this.pedirMas();
  }

  ngAfterViewInit(): void {
    // los observers se inicializan aqui porque necesitan que el dom ya exista
    this.setupVisible();
    this.setupCentinela();
  }

  ngOnDestroy(): void {
    // limpieza para no dejar observers flotando
    this.obsCentinela?.disconnect();
    this.obsVisible?.disconnect();
  }

  // NUEVO: Función para calcular los conteos por generación
  private calcularConteosGeneracion(): void {
    const conteos: { [key: string]: number } = {
      'Gen 1 (Kanto)': 0,
      'Gen 2 (Johto)': 0,
      'Gen 3 (Hoenn)': 0,
      'Gen 4 (Sinnoh)': 0,
      'Gen 5 (Teselia)': 0,
      'Gen 6 (Kalos)': 0,
      'Gen 7 (Alola)': 0,
      'Gen 8 (Galar)': 0,
      'Gen 9 (Paldea)': 0
    };

    // Usando un for loop tradicional
    for (let i = 0; i < this.listaPokemonCompleta.length; i++) {
      const p = this.listaPokemonCompleta[i];
      const id = parseInt(p.id);
      if (id >= 1 && id <= 151) conteos['Gen 1 (Kanto)']++;
      else if (id >= 152 && id <= 251) conteos['Gen 2 (Johto)']++;
      else if (id >= 252 && id <= 386) conteos['Gen 3 (Hoenn)']++;
      else if (id >= 387 && id <= 493) conteos['Gen 4 (Sinnoh)']++;
      else if (id >= 494 && id <= 649) conteos['Gen 5 (Teselia)']++;
      else if (id >= 650 && id <= 721) conteos['Gen 6 (Kalos)']++;
      else if (id >= 722 && id <= 809) conteos['Gen 7 (Alola)']++;
      else if (id >= 810 && id <= 905) conteos['Gen 8 (Galar)']++;
      else if (id >= 906 && id <= 1025) conteos['Gen 9 (Paldea)']++;
    }

    this.conteosGeneracion = conteos;
    this.cdr.detectChanges(); // Forzamos actualización de vista por si acaso
  }

  // NUEVO: Función de búsqueda
  buscarPokemon(): void {
    if (this.terminoBusqueda.trim() === '') {
      return;
    }

    const terminoMin = this.terminoBusqueda.toLowerCase().trim();
    let pokemonEncontrado = null;

    // Usando for tradicional para buscar
    for (let i = 0; i < this.listaPokemonCompleta.length; i++) {
      const p = this.listaPokemonCompleta[i];
      if (p.id === terminoMin || p.nombre.toLowerCase() === terminoMin) {
        pokemonEncontrado = p;
        break;
      }
    }

    if (pokemonEncontrado) {
      // Si existe, navegamos a su detalle
      this.router.navigate(['/pokemon', pokemonEncontrado.id]);
    } else {
      console.log('Pokémon no encontrado.');
    }
  }

  private setupVisible(): void {
    // lo corremos fuera de la zona de angular para que no este chequeando cambios todo el tiempo
    this.ngZone.runOutsideAngular(() => {
      this.obsVisible = new IntersectionObserver(entries => {
        let cambio = false;

        // Mantengo tu forEach original aquí por temas de compatibilidad con la API del Observer
        entries.forEach(entry => {
          const idx = parseInt(entry.target.getAttribute('data-index') ?? '-1');
          const g = this.grupos[idx];
          if (!g) return;

          if (entry.isIntersecting) {
            if (!g.visible) {
              g.visible = true;
              cambio = true;
            }
          } else {
            if (g.visible) {
              // guardamos el alto antes de ocultar para que no salte el scroll
              g.alto = (entry.target as HTMLElement).offsetHeight;
              g.visible = false;
              cambio = true;
            }
          }
        });

        if (cambio) this.ngZone.run(() => this.cdr.detectChanges());
      }, { rootMargin: '800px 0px 800px 0px' });
    });
  }

  private setupCentinela(): void {
    this.ngZone.runOutsideAngular(() => {
      this.obsCentinela = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !this.loading && this.hayMas) {
          this.ngZone.run(() => this.pedirMas());
        }
      }, { rootMargin: '600px' });
    });

    this.obsCentinela.observe(this.centinela.nativeElement);
  }

  private revisarSentinel(): void {
    // a veces el observer no vuelve a disparar si el centinela nunca salio de pantalla
    // entonces lo revisamos manualmente despues de cada carga
    if (this.loading || !this.hayMas || !this.centinela) return;
    const rect = this.centinela.nativeElement.getBoundingClientRect();
    if (rect.top < window.innerHeight + 600) {
      this.pedirMas();
    }
  }

  private registrarNuevos(inicio: number): void {
    const tarjetas = document.querySelectorAll<HTMLElement>('.grupo-evolutivo[data-index]');
    // Mantenemos forEach para los NodeLists de tu diseño
    tarjetas.forEach(t => {
      const idx = parseInt(t.getAttribute('data-index') ?? '-1');
      if (idx >= inicio && !this.yaRegistrados.has(idx)) {
        this.obsVisible.observe(t);
        this.yaRegistrados.add(idx);
      }
    });
  }

  pedirMas(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.pokemonService.getPokemonList(this.LIMITE, this.offset).subscribe(resp => {
      // si ya no hay mas pokemon en la api
      if (this.offset + this.LIMITE >= resp.count) this.hayMas = false;

      const llamadas: Observable<any>[] = resp.results.map((p: any) =>
        forkJoin({
          detalles: this.pokemonService.getPokemonDetails(p.name),
          especie: this.pokemonService.getPokemonSpecies(p.name)
        })
      );

      forkJoin(llamadas as any).subscribe((data: any) => {
        const inicio = this.grupos.length;

        const lista = data.map((item: any) => ({
          id: item.detalles.id,
          nombre: item.detalles.name,
          imagen: item.detalles.sprites.other['official-artwork'].front_default,
          tipo: item.detalles.types[0].type.name,
          urlCadena: item.especie.evolution_chain.url
        }));

        this.agrupar(lista);
        this.offset += this.LIMITE;
        this.loading = false;
        this.cdr.detectChanges();

        setTimeout(() => this.registrarNuevos(inicio), 0);
        setTimeout(() => this.revisarSentinel(), 150);
      });
    });
  }

  private agrupar(lista: any[]): void {
    // usamos un Map para agrupar por cadena evolutiva
    const mapa = new Map<string, any[]>();
    
    // Usando for tradicional en la lógica nueva para mayor claridad
    for (let i = 0; i < lista.length; i++) {
      const p = lista[i];
      const g = mapa.get(p.urlCadena) ?? [];
      g.push(p);
      mapa.set(p.urlCadena, g);
    }

    const nuevos: GrupoEvolutivo[] = Array.from(mapa.values())
      .map(g => {
        const s = g.sort((a, b) => a.id - b.id);
        return { base: s[0], evoluciones: s, visible: true, alto: 300 };
      })
      .sort((a, b) => a.base.id - b.base.id);

    this.grupos.push(...nuevos);
  }
}