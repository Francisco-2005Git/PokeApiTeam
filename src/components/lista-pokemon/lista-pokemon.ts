import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild, NgZone } from '@angular/core';
import { PokemonService } from '../../services/pokemon';
import { RouterLink } from '@angular/router';
import { NgClass, TitleCasePipe, UpperCasePipe } from '@angular/common';
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
  imports: [RouterLink, NgClass, TitleCasePipe, UpperCasePipe],
  providers: [PokemonService],
  templateUrl: './lista-pokemon.html',
  styleUrl: './lista-pokemon.css',
})
export class ListaPokemon implements OnInit, AfterViewInit, OnDestroy {

  grupos: GrupoEvolutivo[] = [];
  loading = false;
  hayMas = true;

  private offset = 0;
  private readonly LIMITE = 20;

  private yaRegistrados = new Set<number>();
  private obsCentinela!: IntersectionObserver;
  private obsVisible!: IntersectionObserver;

  @ViewChild('sentinel') centinela!: ElementRef;

  constructor(
    private pokemonService: PokemonService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
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
    lista.forEach(p => {
      const g = mapa.get(p.urlCadena) ?? [];
      g.push(p);
      mapa.set(p.urlCadena, g);
    });

    const nuevos: GrupoEvolutivo[] = Array.from(mapa.values())
      .map(g => {
        const s = g.sort((a, b) => a.id - b.id);
        return { base: s[0], evoluciones: s, visible: true, alto: 300 };
      })
      .sort((a, b) => a.base.id - b.base.id);

    this.grupos.push(...nuevos);
  }
}
