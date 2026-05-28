import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild, NgZone } from '@angular/core';
import { PokemonService } from '../../services/pokemon';
import { Router, RouterLink } from '@angular/router';
import { NgClass, TitleCasePipe, UpperCasePipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

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
  imports: [RouterLink, NgClass, TitleCasePipe, UpperCasePipe, FormsModule, KeyValuePipe],
  providers: [PokemonService],
  templateUrl: './lista-pokemon.html',
  styleUrl: './lista-pokemon.css',
})
export class ListaPokemon implements OnInit, AfterViewInit, OnDestroy {

  grupos: GrupoEvolutivo[] = [];
  loading = false;
  hayMas = true;

  //Variables para el buscador y las generaciones
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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.pokemonService.getPokemonList(1025, 0).subscribe(resp => {
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

  // cuenta cuantos pokemon hay en cada gen
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
    this.cdr.detectChanges(); // a veces no refresca solo
  }

  // devuelve la imagen de la region segun la gen
  getRegionImg(key: string): string {
    const mapa: { [k: string]: string } = {
      'Gen 1 (Kanto)':   '/assets/regions/kanto_bg.png',
      'Gen 2 (Johto)':   '/assets/regions/johto_bg.png',
      'Gen 3 (Hoenn)':   '/assets/regions/hoenn_bg.png',
      'Gen 4 (Sinnoh)':  '/assets/regions/sinnoh_bg.png',
      'Gen 5 (Teselia)': '/assets/regions/unova_bg.png',
      'Gen 6 (Kalos)':   '/assets/regions/kalos_bg.png',
      'Gen 7 (Alola)':   '/assets/regions/alola_bg.png',
      'Gen 8 (Galar)':   '/assets/regions/galar_bg.png',
      'Gen 9 (Paldea)':  '/assets/regions/paldea_bg.png',
    };
    return mapa[key] ?? '';
  }

  buscarPokemon(): void {
    if (this.terminoBusqueda.trim() === '') {
      return;
    }

    const terminoMin = this.terminoBusqueda.toLowerCase().trim();
    let pokemonEncontrado = null;

    for (let i = 0; i < this.listaPokemonCompleta.length; i++) {
      const p = this.listaPokemonCompleta[i];
      if (p.id === terminoMin || p.nombre.toLowerCase() === terminoMin) {
        pokemonEncontrado = p;
        break;
      }
    }

    if (pokemonEncontrado) {
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
      // paramos en 1025 (fin gen 9), lo que sigue son formas alternativas que no queremos mostrar aqui
      if (this.offset + this.LIMITE >= 1025) this.hayMas = false;

      // primero pedimos los detalles, y con el nombre de especie que nos devuelven
      // pedimos la especie -- esto evita el 404 que pasa con nombres como "deoxys-normal"
      const llamadas = resp.results.map((p: any) =>
        this.pokemonService.getPokemonDetails(p.name).pipe(
          switchMap(detalles =>
            this.pokemonService.getPokemonSpecies(detalles.species.name).pipe(
              map(especie => ({ detalles, especie })),
              catchError(() => of({ detalles, especie: null }))
            )
          ),
          catchError(() => of(null))
        )
      );

      forkJoin(llamadas).subscribe({
        next: (data: any) => {
          const inicio = this.grupos.length;

          // filtramos los que fallaron o no tienen cadena evolutiva, y los que son formas (id > 1025)
          const lista = data
            .filter((item: any) => item !== null && item.especie?.evolution_chain && item.detalles.id <= 1025)
            .map((item: any) => ({
              id: item.detalles.id,
              nombre: item.detalles.name,
              imagen: item.detalles.sprites.other['official-artwork']?.front_default ?? '',
              tipo: item.detalles.types[0].type.name,
              urlCadena: item.especie.evolution_chain.url
            }));

          this.agrupar(lista);
          this.offset += this.LIMITE;
          this.loading = false;
          this.cdr.detectChanges();

          setTimeout(() => this.registrarNuevos(inicio), 0);
          setTimeout(() => this.revisarSentinel(), 150);
        },
        error: (err: any) => {
          // si falla todo el batch lo saltamos para no quedarnos trabados
          console.error('fallo un batch completo, saltando rango...', err);
          this.offset += this.LIMITE;
          this.loading = false;
          this.cdr.detectChanges();
          setTimeout(() => this.revisarSentinel(), 500);
        }
      });
    });
  }

  private agrupar(lista: any[]): void {
    // agrupamos por cadena evolutiva para mostrar las evos juntas
    const mapa = new Map<string, any[]>();

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