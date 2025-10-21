import { Component, OnInit, signal } from '@angular/core';
import { PhotoService, UserPhoto } from '../services/photo';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    NgFor,
    NgIf
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  photos = signal<UserPhoto[]>([]);

  constructor(private photoService: PhotoService) {}

  async ngOnInit() {
    await this.photoService.loadSaved();
    this.photos.set(this.photoService.photos);
    this.photoService.photosChanged.subscribe((p) => this.photos.set(p));
  }

  async takePhoto() {
    await this.photoService.addNewToGallery();
  }

  // Función para descargar archivo .txt con fotos y coordenadas
  async downloadTxt() {
    this.photoService.downloadPhotoLocationsTxt();
  }
}
