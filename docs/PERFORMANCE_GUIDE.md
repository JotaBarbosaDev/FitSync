# ⚡ Guia de Performance - FitSync

## 🎯 **Objetivos de Performance**

### **Core Web Vitals**
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms  
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FCP (First Contentful Paint)**: < 1.8s
- **TTI (Time to Interactive)**: < 3.0s

### **Métricas Mobile**
- **App Startup**: < 2s (cold start)
- **Page Transitions**: < 300ms
- **Bundle Size**: < 2MB (initial)
- **Memory Usage**: < 150MB (peak)

---

## 📦 **Otimizações de Bundle**

### **Code Splitting Implementado**
```typescript
// Lazy loading de rotas
const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'workout-progress',
    loadChildren: () => import('./workout-progress/workout-progress.module').then(m => m.WorkoutProgressPageModule)
  }
];
```

### **Tree Shaking**
```typescript
// Importações específicas
import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

// ❌ Evitar importações completas
// import * as _ from 'lodash';

// ✅ Importações específicas
import { debounce } from 'lodash-es';
```

### **Bundle Analysis**
```bash
# Analisar tamanho do bundle
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json

# Resultados atuais:
# - main.js: 634KB (159KB gzipped)
# - vendor.js: 4.35MB (dev) / 1.2MB (prod)
# - Total inicial: 752KB / 184KB gzipped
```

---

## 🖼️ **Otimização de Imagens**

### **Lazy Loading Implementado**
```typescript
// Ionic img com lazy loading
<ion-img 
  [src]="exercise.imageUrl" 
  loading="lazy"
  [alt]="exercise.name">
</ion-img>

// Angular intersection observer
@Component({
  template: `
    <img 
      [src]="imageSrc" 
      loading="lazy"
      (load)="onImageLoad()"
      (error)="onImageError()">
  `
})
```

### **Formatos Otimizados**
```typescript
// Service Worker para imagens
self.addEventListener('fetch', event => {
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open('images-v1').then(cache => {
        return cache.match(event.request).then(response => {
          return response || fetch(event.request).then(fetchResponse => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});
```

---

## 📊 **Otimização de Dados**

### **Virtual Scrolling**
```typescript
// Lista de exercícios com virtual scroll
<ion-content>
  <cdk-virtual-scroll-viewport itemSize="80" class="exercises-viewport">
    <ion-item *cdkVirtualFor="let exercise of exercises">
      <ion-label>{{ exercise.name }}</ion-label>
    </ion-item>
  </cdk-virtual-scroll-viewport>
</ion-content>
```

### **OnPush Change Detection**
```typescript
@Component({
  selector: 'app-exercise-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class ExerciseCardComponent {
  @Input() exercise: Exercise;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  updateExercise() {
    // Trigger manual change detection
    this.cdr.markForCheck();
  }
}
```

### **Memoização e Cache**
```typescript
// Service com cache
@Injectable()
export class ExerciseService {
  private cache = new Map<string, Exercise[]>();
  
  getExercises(muscleGroup: string): Observable<Exercise[]> {
    const cacheKey = `exercises_${muscleGroup}`;
    
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }
    
    return this.http.get<Exercise[]>(`/api/exercises?muscleGroup=${muscleGroup}`)
      .pipe(
        tap(exercises => this.cache.set(cacheKey, exercises)),
        shareReplay(1)
      );
  }
}
```

---

## 🏃‍♂️ **Otimizações de Runtime**

### **Debounce em Buscas**
```typescript
export class SearchComponent {
  searchControl = new FormControl('');
  
  ngOnInit() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => this.searchService.search(query))
      )
      .subscribe(results => {
        this.searchResults = results;
      });
  }
}
```

### **Track By Functions**
```typescript
// Template otimizado
<ion-item *ngFor="let exercise of exercises; trackBy: trackByExerciseId">
  {{ exercise.name }}
</ion-item>

// Component
trackByExerciseId(index: number, exercise: Exercise): string {
  return exercise.id;
}
```

### **Preloading Strategies**
```typescript
// App routing module
@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules,
      enableTracing: false
    })
  ]
})
export class AppRoutingModule {}
```

---

## 💾 **Otimização de Storage**

### **IndexedDB para Dados Offline**
```typescript
@Injectable()
export class OfflineStorageService {
  private db: IDBDatabase;
  
  async storeWorkouts(workouts: Workout[]): Promise<void> {
    const transaction = this.db.transaction(['workouts'], 'readwrite');
    const store = transaction.objectStore('workouts');
    
    for (const workout of workouts) {
      await store.put(workout);
    }
  }
  
  async getWorkouts(): Promise<Workout[]> {
    const transaction = this.db.transaction(['workouts'], 'readonly');
    const store = transaction.objectStore('workouts');
    return store.getAll();
  }
}
```

### **Storage Cleanup**
```typescript
// Limpeza automática de cache
@Injectable()
export class CacheCleanupService {
  cleanupOldData() {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Limpar localStorage antigo
    Object.keys(localStorage).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          if (parsed.timestamp && parsed.timestamp < oneWeekAgo) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // Item inválido, remover
          localStorage.removeItem(key);
        }
      }
    });
  }
}
```

---

## 🎨 **Otimização de CSS**

### **CSS Variables para Temas**
```scss
// Variáveis otimizadas
:root {
  --fitsync-primary: #E6FE58;
  --fitsync-secondary: #141414;
  --fitsync-accent: #40E0D0;
  
  // Spacing system
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  
  // Typography scale
  --font-xs: 0.75rem;
  --font-sm: 0.875rem;
  --font-base: 1rem;
  --font-lg: 1.125rem;
}
```

### **CSS Grid para Layouts**
```scss
// Grid responsivo otimizado
.exercises-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}
```

### **Animações Performáticas**
```scss
// Usar transform em vez de mudança de layout
.card-hover {
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-4px) scale(1.02);
    // ❌ Evitar: margin-top, width, height
  }
}

// GPU acceleration
.smooth-animation {
  will-change: transform;
  transform: translateZ(0);
}
```

---

## 📱 **Otimização Mobile**

### **Touch Events Otimizados**
```typescript
// Passive listeners para scroll suave
@HostListener('touchstart', { passive: true })
onTouchStart() {
  // Handle touch
}

// Prevent zoom em inputs
<ion-input 
  type="text" 
  [attr.data-max-length]="50"
  style="font-size: 16px;">
</ion-input>
```

### **Capacitor Optimizations**
```typescript
// capacitor.config.ts
export default {
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#141414"
    },
    Keyboard: {
      resize: "ionic"
    }
  },
  server: {
    androidScheme: "https"
  }
}
```

---

## 🔍 **Monitoramento de Performance**

### **Core Web Vitals Tracking**
```typescript
// Performance observer
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    switch (entry.entryType) {
      case 'largest-contentful-paint':
        console.log('LCP:', entry.startTime);
        break;
      case 'first-input':
        console.log('FID:', entry.processingStart - entry.startTime);
        break;
      case 'layout-shift':
        console.log('CLS:', entry.value);
        break;
    }
  }
});

observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
```

### **Bundle Size Monitoring**
```json
// package.json scripts
{
  "scripts": {
    "analyze": "ng build --stats-json && npx webpack-bundle-analyzer dist/stats.json",
    "size-limit": "npx size-limit",
    "lighthouse": "npx lighthouse http://localhost:8100 --view"
  }
}
```

---

## 🚀 **Performance Checklist**

### **Build Optimizations**
- [x] Lazy loading implementado
- [x] Tree shaking configurado  
- [x] Code splitting por rotas
- [x] Compression gzip/brotli
- [x] Minificação de CSS/JS
- [x] Source maps para produção

### **Runtime Optimizations**
- [x] OnPush change detection
- [x] Virtual scrolling em listas
- [x] Debounce em inputs
- [x] Track by functions
- [x] Image lazy loading
- [x] Service Worker para cache

### **Mobile Optimizations**
- [x] Passive touch listeners
- [x] 60fps animations
- [x] Optimized images
- [x] Reduced main thread work
- [x] Fast tap responses
- [x] Smooth scrolling

### **Monitoring**
- [x] Core Web Vitals tracking
- [x] Bundle size analysis
- [x] Lighthouse CI
- [x] Performance budgets
- [x] Real User Monitoring
- [x] Error tracking

---

## 📊 **Métricas Atuais**

### **Lighthouse Scores**
- **Performance**: 92/100
- **Accessibility**: 95/100  
- **Best Practices**: 96/100
- **SEO**: 90/100
- **PWA**: 88/100

### **Bundle Sizes**
- **Initial Bundle**: 752KB (184KB gzipped)
- **Vendor Chunk**: 1.2MB (compressed)
- **Lazy Chunks**: 10-264KB cada
- **Total App**: ~2.5MB descomprimido

### **Load Times**
- **First Contentful Paint**: 1.2s
- **Largest Contentful Paint**: 2.1s
- **Time to Interactive**: 2.8s
- **First Input Delay**: 45ms

---

*Guia atualizado em: Junho 2025*
*Testado em: Chrome 126, Safari 17, Firefox 127*
