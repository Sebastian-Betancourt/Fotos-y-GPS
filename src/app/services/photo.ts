import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo as CameraPhoto } from '@capacitor/camera';
import { Filesystem, Directory, ReadFileResult } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';
  public photosChanged: BehaviorSubject<UserPhoto[]> = new BehaviorSubject<UserPhoto[]>([]);

  constructor(private platform: Platform) {}

  // Captura foto + ubicación
  public async addNewToGallery() {
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });

    // Obtener ubicación GPS
    let latitude: number | undefined = undefined;
    let longitude: number | undefined = undefined;
    let mapsLink: string | undefined = undefined;

    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
      mapsLink = `https://www.google.com/maps/@${latitude},${longitude}`;
    } catch (e) {
      console.warn('No se pudo obtener la ubicación', e);
    }

    const savedImageFile = await this.savePicture(capturedPhoto);

    // Agregar ubicación al objeto
    savedImageFile.latitude = latitude;
    savedImageFile.longitude = longitude;
    savedImageFile.mapsLink = mapsLink;

    this.photos.unshift(savedImageFile);
    await this.saveToPreferences();
    this.photosChanged.next(this.photos);

    // Guardar info en archivo txt
    await this.savePhotoInfoToTxt(savedImageFile);
  }

  // Guardar foto en filesystem
  private async savePicture(cameraPhoto: CameraPhoto): Promise<UserPhoto> {
    const base64Data = await this.readAsBase64(cameraPhoto);
    const fileName = new Date().getTime() + '.jpeg';

    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });

    const newPhoto: UserPhoto = {
      filepath: fileName,
      webviewPath: cameraPhoto.webPath,
    };

    return newPhoto;
  }

  private async readAsBase64(cameraPhoto: CameraPhoto): Promise<string> {
    if (this.platform.is('hybrid')) {
      const file: ReadFileResult = await Filesystem.readFile({ path: cameraPhoto.path! });
      return file.data as string;
    } else {
      const response = await fetch(cameraPhoto.webPath!);
      const blob = await response.blob();
      return await this.convertBlobToBase64(blob);
    }
  }

  private convertBlobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

  // Cargar fotos guardadas
  public async loadSaved() {
    const photoList = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = photoList.value ? JSON.parse(photoList.value) : [];
    this.photosChanged.next(this.photos);
  }

  private async saveToPreferences() {
    await Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  }

  // Guardar info en archivo txt
  private async savePhotoInfoToTxt(photo: UserPhoto) {
    const txtContent = `Foto: ${photo.filepath}, Latitud: ${photo.latitude}, Longitud: ${photo.longitude}, Link: ${photo.mapsLink}\n`;
    const txtFileName = 'photo_locations.txt';

    try {
      const existing = await Filesystem.readFile({ path: txtFileName, directory: Directory.Data });
      await Filesystem.writeFile({
        path: txtFileName,
        data: existing.data + txtContent,
        directory: Directory.Data,
      });
    } catch {
      await Filesystem.writeFile({
        path: txtFileName,
        data: txtContent,
        directory: Directory.Data,
      });
    }
  }
  // Descargar archivo txt en web
public downloadPhotoLocationsTxt() {
  let txtContent = '';
  this.photos.forEach(photo => {
    txtContent += `Foto: ${photo.filepath}, Latitud: ${photo.latitude}, Longitud: ${photo.longitude}, Link: ${photo.mapsLink}\n`;
  });

  const blob = new Blob([txtContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'photo_locations.txt';
  a.click();
  window.URL.revokeObjectURL(url);
}

}

// Interfaz para cada foto
export interface UserPhoto {
  filepath: string;
  webviewPath?: string;

  // Ubicación
  latitude?: number;
  longitude?: number;
  mapsLink?: string;
}
