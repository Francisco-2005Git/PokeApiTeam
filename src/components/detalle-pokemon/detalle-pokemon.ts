import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PokemonService } from '../../services/pokemon.service';

@Component({
  selector: 'app-detalle-pokemon',
  imports: [PokemonService],
  templateUrl: './detalle-pokemon.html',
  styleUrl: './detalle-pokemon.css',
})
export class DetallePokemon implements OnInit {
  pokemon: any;
  descripcion: string = '';
  galeria: string[] = [];
  tipoPrincipal: string = '';
  
  // NUEVO: Aquí guardaremos la lista de evoluciones { nombre: string, id: string }
  evoluciones: any[] = []; 

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService
  ) { }

  ngOnInit(): void {
    // Al suscribirnos a paramMap, Angular detecta automáticamente cuando 
    // hacemos clic en una evolución (cambia la URL de /pokemon/1 a /pokemon/2)
    // y vuelve a ejecutar todo este bloque, actualizando la pantalla.
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        // Limpiamos los datos anteriores antes de cargar el nuevo Pokémon
        this.evoluciones = [];
        this.pokemon = null;
        this.cargarDatosPokemon(id);
      }
    });
  }

  cargarDatosPokemon(id: string): void {
    // 1. Obtener detalles básicos... (Este código ya lo tienes)
    this.pokemonService.getPokemonDetails(id).subscribe(detalles => {
      this.pokemon = detalles;
      this.tipoPrincipal = detalles.types[0].type.name;
      
      this.galeria = [
        detalles.sprites.front_default,
        detalles.sprites.back_default,
        detalles.sprites.front_shiny
      ].filter(img => img !== null);
    });

    // 2. Obtener la especie (para la descripción Y la cadena evolutiva)
    this.pokemonService.getPokemonSpecies(id).subscribe(especie => {
      const entradaDex = especie.flavor_text_entries.find((entry: any) => entry.language.name === 'es');
      this.descripcion = entradaDex ? entradaDex.flavor_text.replace(/\f|\n/g, ' ') : 'Sin descripción.';

      // NUEVO: ¡Extraemos la URL de la cadena evolutiva y hacemos la petición!
      const evolutionUrl = especie.evolution_chain.url;
      this.pokemonService.getEvolutionChain(evolutionUrl).subscribe(evoluciones => {
        this.procesarCadenaEvolutiva(evoluciones.chain);
      });
    });
  }

  // NUEVO: La función recursiva para navegar el árbol
  procesarCadenaEvolutiva(cadena: any): void {
    // 1. Extraemos el nombre y el ID de la especie actual en este nivel del árbol
    const speciesName = cadena.species.name;
    // La URL es algo como "https://pokeapi.co/api/v2/pokemon-species/25/"
    // Cortamos la URL por las "/" y tomamos el penúltimo elemento para sacar el ID
    const urlParts = cadena.species.url.split('/');
    const speciesId = urlParts[urlParts.length - 2];

    // Lo agregamos a nuestro arreglo de evoluciones
    this.evoluciones.push({
      nombre: speciesName,
      id: speciesId
    });

    // 2. RECURSIVIDAD: Si este Pokémon tiene evoluciones, iteramos sobre ellas
    // y volvemos a llamar a esta misma función para cada una (ej. Eevee -> Vaporeon, Jolteon, etc.)
    if (cadena.evolves_to && cadena.evolves_to.length > 0) {
      cadena.evolves_to.forEach((evolucionSiguiente: any) => {
        this.procesarCadenaEvolutiva(evolucionSiguiente);
      });
    }
  }

  reproducirGrito(): void {
    if (this.pokemon && this.pokemon.cries && this.pokemon.cries.latest) {
      const audio = new Audio(this.pokemon.cries.latest);
      audio.volume = 0.5; // Un volumen moderado
      audio.play();
    }
  }
}