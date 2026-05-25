import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ListaPokemon } from '../lista-pokemon/lista-pokemon';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, ListaPokemon],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class LayoutComponent {}
