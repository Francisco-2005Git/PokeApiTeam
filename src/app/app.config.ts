import { ApplicationConfig, NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

import { HttpClientModule } from '@angular/common/http';
import { PokemonService } from '../services/pokemon';
import { DetallePokemon } from '../components/detalle-pokemon/detalle-pokemon';
import { ListaPokemon } from '../components/lista-pokemon/lista-pokemon';
import { App } from './app';
import { BrowserModule } from '@angular/platform-browser';

@NgModule({
  declarations: [ DetallePokemon,ListaPokemon,PokemonService ],
  imports: [
    BrowserModule,
    HttpClientModule // ¡Agrega esta línea aquí!
   ],
   providers: [],
    bootstrap: [App]
})
 export class AppModule { }

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    HttpClient()
  ]
};
