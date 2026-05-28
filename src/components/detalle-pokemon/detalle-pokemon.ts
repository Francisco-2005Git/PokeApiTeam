import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass, NgIf, NgFor, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { PokemonService } from '../../services/pokemon';
import { forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-detalle-pokemon',
  imports: [RouterLink, NgClass, NgIf, NgFor, TitleCasePipe, UpperCasePipe],
  templateUrl: './detalle-pokemon.html',
  styleUrl: './detalle-pokemon.css',
})
export class DetallePokemon implements OnInit {
  pokemon: any;
  descripcion: string = '';
  galeria: string[] = [];
  tipo: string = '';
  evoluciones: any[] = [];
  especieId: string = '';
  sufijoForma: string = '';

  //Variable para la URL de la imagen de fondo de la región
  regionBackgroundImageUrl: string = '';

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // escucha cambios en la url para cuando se navega entre pokemones
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        // limpiamos todo antes de cargar el nuevo
        this.pokemon = null;
        this.evoluciones = [];
        this.descripcion = '';
        
        //Limpiamos la imagen anterior al cambiar de Pokémon
        this.regionBackgroundImageUrl = ''; 
        
        this.cdr.detectChanges();
        this.cargarDatos(id);
      }
    });
  }

  cargarDatos(id: string): void {
    this.pokemonService.getPokemonDetails(id).subscribe({
      next: (detalles) => {
        this.pokemon = detalles;
        this.tipo = detalles.types[0].type.name;

        this.galeria = [
          detalles.sprites.front_default,
          detalles.sprites.back_default,
          detalles.sprites.front_shiny,
        ].filter(img => img !== null);

        this.cdr.detectChanges();

        this.http.get(detalles.species.url).subscribe({
          next: (especie: any) => {
            const txt = especie.flavor_text_entries.find(
              (e: any) => e.language.name === 'es'
            );
            this.descripcion = txt
              ? txt.flavor_text.replace(/\f|\n/g, ' ')
              : 'Sin descripción.';

            this.establecerImagenFondoRegion(especie.id);
            this.especieId = especie.id.toString();

            const sufijos = ['-alola', '-galar', '-hisui', '-paldea', '-hisuian'];
            this.sufijoForma = sufijos.find(s => detalles.name.includes(s)) ?? '';

            this.cdr.detectChanges();

            this.pokemonService.getEvolutionChain(especie.evolution_chain.url).subscribe(chain => {
              const eslabones: any[] = [];
              this.extraerEslabones(chain.chain, eslabones);

              if (!this.sufijoForma) {
                this.evoluciones = [];
                this.buscarCamino(chain.chain, especie.id.toString());
                this.cdr.detectChanges();
                return;
              }

              const llamadas = eslabones.map((eslabon: any) =>
                this.pokemonService.getPokemonVarieties(eslabon.id)
              );

              forkJoin(llamadas).subscribe((especies: any[]) => {
                this.evoluciones = eslabones.map((eslabon: any, i: number) => {
                  const variedad = especies[i].varieties.find((v: any) =>
                    v.pokemon.name.endsWith(this.sufijoForma)
                  );
                  if (variedad) {
                    const partes = variedad.pokemon.url.split('/').filter(Boolean);
                    return {
                      nombre: variedad.pokemon.name,
                      id: partes[partes.length - 1]
                    };
                  }
                  return eslabon;
                });
                this.cdr.detectChanges();
              });
            });
          },
          error: () => {
            this.descripcion = 'Sin descripción disponible para esta forma.';
            this.regionBackgroundImageUrl = '';
            this.evoluciones = [];
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.descripcion = 'Pokémon no encontrado.';
        this.cdr.detectChanges();
      }
    });
  }

  procesarEvoluciones(cadena: any): void {
    this.evoluciones = [];
    this.buscarCamino(cadena, this.pokemon.id.toString());
  }

  // recorre el arbol buscando el camino que pasa por el pokemon actual
  // cuando lo encuentra, decide si seguir la cadena lineal o mostrar las ramas
  private buscarCamino(nodo: any, idBuscado: string): boolean {
    const partes = nodo.species.url.split('/');
    const id = partes[partes.length - 2];

    this.evoluciones.push({ nombre: nodo.species.name, id });

    if (id === idBuscado) {
      if (nodo.evolves_to?.length === 1) {
        // cadena lineal: Sigue hasta el final
        this.seguirLineal(nodo.evolves_to[0]);
      } else if (nodo.evolves_to?.length > 1) {
        // tiene varias ramas: Se muestran todas sin profundizar en cada una
        nodo.evolves_to.forEach((sig: any) => {
          const sigPartes = sig.species.url.split('/');
          this.evoluciones.push({ nombre: sig.species.name, id: sigPartes[sigPartes.length - 2] });
        });
      }
      return true;
    }

    for (const sig of (nodo.evolves_to ?? [])) {
      if (this.buscarCamino(sig, idBuscado)) {
        return true;
      }
    }

    this.evoluciones.pop();
    return false;
  }

  private extraerEslabones(nodo: any, resultado: any[]): void {
    const partes = nodo.species.url.split('/').filter(Boolean);
    const id = partes[partes.length - 1];
    resultado.push({ nombre: nodo.species.name, id });
    // solo seguimos la cadena lineal, sin bifurcaciones
    if (nodo.evolves_to?.length >= 1) {
      this.extraerEslabones(nodo.evolves_to[0], resultado);
    }
  }

  // sigue la cadena cuando es lineal (un solo siguiente) hasta llegar al final
  // si en algun punto hay bifurcacion, muestra todas las ramas de ese punto
  private seguirLineal(nodo: any): void {
    const partes = nodo.species.url.split('/');
    const id = partes[partes.length - 2];
    this.evoluciones.push({ nombre: nodo.species.name, id });

    if (nodo.evolves_to?.length === 1) {
      this.seguirLineal(nodo.evolves_to[0]);
    } else if (nodo.evolves_to?.length > 1) {
      // el siguiente eslabón ya tiene ramas, las mostramos todas
      nodo.evolves_to.forEach((sig: any) => {
        const sigPartes = sig.species.url.split('/');
        this.evoluciones.push({ nombre: sig.species.name, id: sigPartes[sigPartes.length - 2] });
      });
    }
  }

  reproducirGrito(): void {
    if (this.pokemon?.cries?.latest) {
      const audio = new Audio(this.pokemon.cries.latest);
      audio.volume = 0.5;
      audio.play();
    }
  }

  //Función para determinar la región y establecer la imagen de fondo
  establecerImagenFondoRegion(id: number): void {
    // Se mapean las regiones a las imágenes en la carpeta assets
    const mapRegiones: { [key: string]: string } = {
      'Kanto': 'assets/regions/kanto_bg.png',
      'Johto': 'assets/regions/johto_bg.png',
      'Hoenn': 'assets/regions/hoenn_bg.png',
      'Sinnoh': 'assets/regions/sinnoh_bg.png',
      'Unova': 'assets/regions/unova_bg.png',
      'Kalos': 'assets/regions/kalos_bg.png',
      'Alola': 'assets/regions/alola_bg.png',
      'Galar': 'assets/regions/galar_bg.png',
      'Paldea': 'assets/regions/paldea_bg.png'
    };
    
    let region = '';
    // lógica de rangos
    if (id >= 1 && id <= 151) region = 'Kanto';
    else if (id >= 152 && id <= 251) region = 'Johto';
    else if (id >= 252 && id <= 386) region = 'Hoenn';
    else if (id >= 387 && id <= 493) region = 'Sinnoh';
    else if (id >= 494 && id <= 649) region = 'Unova';
    else if (id >= 650 && id <= 721) region = 'Kalos';
    else if (id >= 722 && id <= 809) region = 'Alola';
    else if (id >= 810 && id <= 905) region = 'Galar';
    else if (id >= 906 && id <= 1025) region = 'Paldea';
    
    // Se asigna la URL
    this.regionBackgroundImageUrl = mapRegiones[region] || '';
  }
}