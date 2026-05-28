import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {

  private url = 'https://pokeapi.co/api/v2';

  constructor(private http: HttpClient) { }

  // trae la lista de pokemon con limite y desde donde empezar
  getPokemonList(limit: number = 20, offset: number = 0): Observable<any> {
    return this.http.get(`${this.url}/pokemon?limit=${limit}&offset=${offset}`);
  }

  getPokemonDetails(nameOrId: string | number): Observable<any> {
    return this.http.get(`${this.url}/pokemon/${nameOrId}`);
  }

  // esto trae la descripcion y la url de la cadena evolutiva
  getPokemonSpecies(nameOrId: string | number): Observable<any> {
    return this.http.get(`${this.url}/pokemon-species/${nameOrId}`);
  }

  getEvolutionChain(url: string): Observable<any> {
    return this.http.get(url);
  }

  getPokemonSpeciesByUrl(url: string): Observable<any> {
    return this.http.get(url);
  }
  getPokemonVarieties(speciesId: string | number): Observable<any> {
    return this.http.get(`${this.url}/pokemon-species/${speciesId}`);
  }
}