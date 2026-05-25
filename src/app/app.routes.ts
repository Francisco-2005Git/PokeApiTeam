import { Routes } from '@angular/router';
import { ListaPokemon } from '../components/lista-pokemon/lista-pokemon';
import { DetallePokemon } from '../components/detalle-pokemon/detalle-pokemon';

export const routes: Routes = [
  { path: '', component: ListaPokemon },
  { path: 'pokemon/:id', component: DetallePokemon }
];
