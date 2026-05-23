import { Component, OnInit } from '@angular/core';
import { PokemonService } from '../../services/pokemon';
import { RouterLink } from '@angular/router';
import { NgClass, TitleCasePipe, UpperCasePipe } from '@angular/common';



@Component({
  selector: 'app-lista-pokemon',
  imports: [RouterLink,NgClass,TitleCasePipe,UpperCasePipe],
  providers:[PokemonService],
  templateUrl: './lista-pokemon.html',
  styleUrl: './lista-pokemon.css',
})
export class ListaPokemon implements OnInit {
  // Aquí guardaremos los Pokémon ya procesados con su imagen y tipo
  listaPokemon: any[] = [];

  // Inyectamos nuestro servicio
  constructor(private pokemonService: PokemonService) { }

  ngOnInit(): void {
    this.cargarPokemon();
  }

  cargarPokemon(): void {
    // 1. Pedimos los primeros 20 Pokémon
    this.pokemonService.getPokemonList(20, 0).subscribe(respuesta => {
      const resultadosBasicos = respuesta.results;

      // 2. Por cada Pokémon, hacemos una nueva petición para traer sus detalles
      resultadosBasicos.forEach((pokemon: any) => {
        this.pokemonService.getPokemonDetails(pokemon.name).subscribe(detalles => {
          
          // Armamos un objeto limpio solo con lo que necesitamos para la tarjeta
          const pokemonProcesado = {
            id: detalles.id,
            nombre: detalles.name,
            imagen: detalles.sprites.other['official-artwork'].front_default, // Usamos el arte oficial como en tu código original
            tipoPrincipal: detalles.types[0].type.name // Tomamos el primer tipo para el color
          };

          // Lo agregamos a nuestro arreglo
          this.listaPokemon.push(pokemonProcesado);

          // TRUCO: Como las peticiones asíncronas llegan a destiempo, los ordenamos por ID 
          // para que Bulbasaur (#1) siempre salga antes que Ivysaur (#2)
          this.listaPokemon.sort((a, b) => a.id - b.id);
        });
      });
    });
  }
}
