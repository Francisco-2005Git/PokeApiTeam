import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass, NgIf, NgFor, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { PokemonService } from '../../services/pokemon';

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

  // NUEVO: Variable para la URL de la imagen de fondo de la región
  regionBackgroundImageUrl: string = '';

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // escuchamos cambios en la url para cuando navegas entre pokemones
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        // limpiamos todo antes de cargar el nuevo
        this.pokemon = null;
        this.evoluciones = [];
        this.descripcion = '';
        
        // NUEVO: Limpiamos la imagen anterior al cambiar de Pokémon
        this.regionBackgroundImageUrl = ''; 
        
        this.cdr.detectChanges();
        this.cargarDatos(id);
      }
    });
  }

  cargarDatos(id: string): void {
    this.pokemonService.getPokemonDetails(id).subscribe(detalles => {
      this.pokemon = detalles;
      this.tipo = detalles.types[0].type.name;

      // filtramos nulls porque algunos sprites no existen en la api
      this.galeria = [
        detalles.sprites.front_default,
        detalles.sprites.back_default,
        detalles.sprites.front_shiny,
      ].filter(img => img !== null);

      this.cdr.detectChanges();
    });

    this.pokemonService.getPokemonSpecies(id).subscribe(especie => {
      const txt = especie.flavor_text_entries.find(
        (e: any) => e.language.name === 'es'
      );
      // el texto de la pokedex viene con \f y saltos raros, los quitamos
      this.descripcion = txt
        ? txt.flavor_text.replace(/\f|\n/g, ' ')
        : 'Sin descripción.';

      // NUEVO: Determinamos la región basada en el ID y establecemos la imagen de fondo
      this.establecerImagenFondoRegion(especie.id);

      this.pokemonService.getEvolutionChain(especie.evolution_chain.url).subscribe(data => {
        this.procesarEvoluciones(data.chain);
        this.cdr.detectChanges();
      });
    });
  }

  procesarEvoluciones(cadena: any): void {
    // la url termina tipo .../12/ entonces sacamos el id de ahi
    const partes = cadena.species.url.split('/');
    const id = partes[partes.length - 2];
    this.evoluciones.push({ nombre: cadena.species.name, id });

    // si tiene evoluciones llamamos recursivo para cada una
    if (cadena.evolves_to?.length > 0) {
      cadena.evolves_to.forEach((sig: any) => this.procesarEvoluciones(sig));
    }
  }

  reproducirGrito(): void {
    if (this.pokemon?.cries?.latest) {
      const audio = new Audio(this.pokemon.cries.latest);
      audio.volume = 0.5;
      audio.play();
    }
  }

  // NUEVO: Función para determinar la región y establecer la imagen de fondo
  establecerImagenFondoRegion(id: number): void {
    // Mapeamos las regiones a las imágenes en tu carpeta assets
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
    // Mantenemos la lógica de rangos que diseñaste
    if (id >= 1 && id <= 151) region = 'Kanto';
    else if (id >= 152 && id <= 251) region = 'Johto';
    else if (id >= 252 && id <= 386) region = 'Hoenn';
    else if (id >= 387 && id <= 493) region = 'Sinnoh';
    else if (id >= 494 && id <= 649) region = 'Unova';
    else if (id >= 650 && id <= 721) region = 'Kalos';
    else if (id >= 722 && id <= 809) region = 'Alola';
    else if (id >= 810 && id <= 905) region = 'Galar';
    else if (id >= 906 && id <= 1025) region = 'Paldea';
    
    // Asignamos la URL
    this.regionBackgroundImageUrl = mapRegiones[region] || '';
  }
}