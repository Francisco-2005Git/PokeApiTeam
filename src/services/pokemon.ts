import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  
  // Guardamos la URL base para no repetirla
  private baseUrl = 'https://pokeapi.co/api/v2';

  // Inyectamos HttpClient en el constructor
  constructor(private http: HttpClient) { }

  /**
   * Obtiene la lista inicial de Pokémon (solo nombres y URLs)
   * @param limit Cantidad de Pokémon a traer (ej. 20)
   * @param offset Desde dónde empezar a contar (ej. 0)
   */
  getPokemonList(limit: number = 20, offset: number = 0): Observable<any> {
    return this.http.get(`${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`);
  }

  /**
   * Obtiene todos los detalles de un Pokémon específico
   * @param nameOrId El nombre o número de Pokédex del Pokémon
   */
  getPokemonDetails(nameOrId: string | number): Observable<any> {
    return this.http.get(`${this.baseUrl}/pokemon/${nameOrId}`);
  }

  /**
   * Obtiene la descripción (flavor text) y la URL de la cadena evolutiva
   * @param nameOrId El nombre o número de Pokédex
   */
  getPokemonSpecies(nameOrId: string | number): Observable<any> {
    return this.http.get(`${this.baseUrl}/pokemon-species/${nameOrId}`);
  }
  /**
   * Obtiene la cadena evolutiva a partir de la URL proporcionada por species
   * @param url La URL completa de la cadena evolutiva
   */
  getEvolutionChain(url: string): Observable<any> {
    return this.http.get(url);
  }
}