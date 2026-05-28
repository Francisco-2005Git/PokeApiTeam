import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass, NgIf, NgFor, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { PokemonService } from '../../services/pokemon';
import { forkJoin } from 'rxjs';

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

  //Variable para la URL de la imagen de fondo de la región
  regionBackgroundImageUrl: string = '';

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService,
    private cdr: ChangeDetectorRef,
    private router: Router
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
    // juntamos los dos requests en un forkJoin para setear todo de una sola vez
    // asi evitamos el NG0100 que pasa cuando cada subscribe llama detectChanges por separado
    forkJoin({
      detalles: this.pokemonService.getPokemonDetails(id),
      especie: this.pokemonService.getPokemonSpecies(id)
    }).subscribe({
      error: () => this.router.navigate(['/']),
      next: ({ detalles, especie }) => {
      this.pokemon = detalles;
      this.tipo = detalles.types[0].type.name;

      // filtramos nulls porque algunos sprites no existen en la api
      this.galeria = [
        detalles.sprites.front_default,
        detalles.sprites.back_default,
        detalles.sprites.front_shiny,
      ].filter(img => img !== null);

      const txt = especie.flavor_text_entries.find(
        (e: any) => e.language.name === 'es'
      );
      this.descripcion = txt
        ? txt.flavor_text.replace(/\f|\n/g, ' ')
        : 'Sin descripción.';

      this.establecerImagenFondoRegion(especie.id);
      this.cdr.detectChanges(); // un solo detectChanges para todo lo de arriba

      this.pokemonService.getEvolutionChain(especie.evolution_chain.url).subscribe(data => {
        this.evoluciones = [];
        this.buscarCamino(data.chain, this.pokemon.id.toString());
        this.cdr.detectChanges();
      });
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