import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild, NgZone } from '@angular/core';
import { PokemonService } from '../../services/pokemon';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NgClass, TitleCasePipe, UpperCasePipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  alto: number;
}

@Component({
  selector: 'app-filtro-regiones',
  imports: [RouterLink, NgClass, TitleCasePipe, UpperCasePipe, FormsModule, KeyValuePipe],
  providers: [PokemonService],
  templateUrl: './filtro-regiones.html',
  styleUrl: './filtro-regiones.css',
})
export class FiltroRegiones implements OnInit, AfterViewInit, OnDestroy {
  grupos: GrupoEvolutivo[] = [];
  loading = false;
  hayMas = true;

  listaPokemonCompleta: any[] = [];
  conteosGeneracion: { [key: string]: number } = {};
  terminoBusqueda: string = '';

  region: string = '';
  rangoMin: number = 0;
  rangoMax: number = 0;

  private rangosRegion: Record<string, { min: number; max: number }> = {
    'Gen 1 (Kanto)':   { min: 1,   max: 151  },
    'Gen 2 (Johto)':   { min: 152, max: 251  },
    'Gen 3 (Hoenn)':   { min: 252, max: 386  },
    'Gen 4 (Sinnoh)':  { min: 387, max: 493  },
    'Gen 5 (Teselia)': { min: 494, max: 649  },
    'Gen 6 (Kalos)':   { min: 650, max: 721  },
    'Gen 7 (Alola)':   { min: 722, max: 809  },
    'Gen 8 (Galar)':   { min: 810, max: 905  },
    'Gen 9 (Paldea)':  { min: 906, max: 1025 },
  };

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
    private router: Router,
    private route: ActivatedRoute 
  ) {}

  ngOnInit(): void {
  this.route.params.subscribe(params => {
    this.region = params['num'];
    this.aplicarRango(this.region);

    this.grupos = [];
    this.offset = 0;
    this.hayMas = true;
    this.yaRegistrados.clear();
    this.cargarRangoCompleto(); 
  });

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
}

private cargarRangoCompleto(): void {
  const lotes: number[][] = [];
  
  for (let id = this.rangoMin; id <= this.rangoMax; id += this.LIMITE) {
    const lote: number[] = [];
    for (let j = id; j < id + this.LIMITE && j <= this.rangoMax; j++) {
      lote.push(j);
    }
    lotes.push(lote);
  }

  let loteActual = 0;

  const cargarSiguienteLote = () => {
    if (loteActual >= lotes.length) {
      this.hayMas = false;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const ids = lotes[loteActual];

    const llamadas: Observable<any>[] = ids.map(id =>
      forkJoin({
        detalles: this.pokemonService.getPokemonDetails(id.toString()),
        especie: this.pokemonService.getPokemonSpecies(id.toString())
      })
    );

    forkJoin(llamadas).subscribe({
      next: (data: any) => {
        const inicio = this.grupos.length;

        const lista = data
          .map((item: any) => ({
            id: item.detalles.id,
            nombre: item.detalles.name,
            imagen: item.detalles.sprites.other['official-artwork'].front_default,
            tipo: item.detalles.types[0].type.name,
            urlCadena: item.especie.evolution_chain.url
          }))
          .filter((p: any) => p.id >= this.rangoMin && p.id <= this.rangoMax);

        this.agrupar(lista);
        loteActual++;
        this.loading = loteActual < lotes.length;
        this.cdr.detectChanges();

        setTimeout(() => this.registrarNuevos(inicio), 0);

        setTimeout(() => cargarSiguienteLote(), 100);
      },
      error: (err) => {
        console.error(`Error en lote ${loteActual}:`, err);
        loteActual++;
        setTimeout(() => cargarSiguienteLote(), 300); 
      }
    });
  };

  cargarSiguienteLote();
}

pedirMas(): void {}

  ngAfterViewInit(): void {
    this.setupVisible();
    this.setupCentinela();
  }

  ngOnDestroy(): void {
    this.obsCentinela?.disconnect();
    this.obsVisible?.disconnect();
  }

  private aplicarRango(region: string): void {
    const rango = this.rangosRegion[region];
    if (rango) {
      this.rangoMin = rango.min;
      this.rangoMax = rango.max;
    } else {
      this.rangoMin = 0;
      this.rangoMax = 0;
    }
  }

  estaEnRango(ndex: number): boolean {
    return ndex >= this.rangoMin && ndex <= this.rangoMax;
  }

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
    this.cdr.detectChanges();
  }

  buscarPokemon(): void {
    if (this.terminoBusqueda.trim() === '') return;

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

  private agrupar(lista: any[]): void {
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