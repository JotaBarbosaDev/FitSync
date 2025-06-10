# 🚀 Guia de Desenvolvimento - FitSync

Este guia contém informações detalhadas para desenvolvedores que desejam contribuir ou entender melhor a arquitetura do FitSync.

## 📋 Índice

- [🏗️ Arquitetura](#️-arquitetura)
- [🔧 Setup de Desenvolvimento](#-setup-de-desenvolvimento)
- [📁 Estrutura de Pastas](#-estrutura-de-pastas)
- [🎨 Padrões de Código](#-padrões-de-código)
- [🧪 Testes](#-testes)
- [📱 Mobile Development](#-mobile-development)
- [🔄 Estado e Dados](#-estado-e-dados)
- [🎨 Styling Guide](#-styling-guide)

---

## 🏗️ Arquitetura

### **📐 Padrão Arquitetural**

O FitSync utiliza uma **arquitetura em camadas** inspirada no **Clean Architecture**:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PRESENTATION  │    │    BUSINESS     │    │      DATA       │
│                 │    │                 │    │                 │
│   ◦ Pages       │◄──►│   ◦ Services    │◄──►│   ◦ Storage     │
│   ◦ Components  │    │   ◦ Models      │    │   ◦ HTTP        │
│   ◦ Guards      │    │   ◦ Validators  │    │   ◦ Cache       │
│   ◦ Pipes       │    │   ◦ Utils       │    │   ◦ External    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **🔄 Fluxo de Dados**

```typescript
// 1. Componente solicita dados
export class WorkoutListPage {
  constructor(private workoutService: WorkoutManagementService) {}
  
  ngOnInit() {
    this.workoutService.getWorkouts().subscribe(workouts => {
      this.workouts = workouts;
    });
  }
}

// 2. Service processa e retorna observables
@Injectable()
export class WorkoutManagementService {
  private workoutsSubject = new BehaviorSubject<Workout[]>([]);
  public workouts$ = this.workoutsSubject.asObservable();
  
  getWorkouts(): Observable<Workout[]> {
    return this.storageService.get('workouts').pipe(
      map(data => this.mapToWorkouts(data))
    );
  }
}

// 3. Storage Service gerencia persistência
@Injectable()
export class StorageService {
  async get(key: string): Promise<any> {
    return await this._storage?.get(key);
  }
}
```

---

## 🔧 Setup de Desenvolvimento

### **📋 Pré-requisitos Detalhados**

```bash
# Versões mínimas requeridas
Node.js >= 18.0.0
npm >= 9.0.0
Git >= 2.30.0

# Verificar versões
node --version
npm --version
git --version
```

### **⚡ Setup Completo**

```bash
# 1. Clone e acesse o projeto
git clone https://github.com/your-repo/fitsync.git
cd fitsync

# 2. Instale dependências
npm ci  # Mais rápido que npm install

# 3. Instale CLIs globais
npm install -g @ionic/cli @angular/cli @capacitor/cli

# 4. Configure hooks de git (opcional)
npm run prepare

# 5. Execute testes para verificar setup
npm test

# 6. Inicie desenvolvimento
ionic serve
```

### **🔧 Configuração do Editor**

#### **VS Code Extensions Recomendadas**

```json
// .vscode/extensions.json
{
  "recommendations": [
    "angular.ng-template",
    "ms-vscode.vscode-typescript-next",
    "ionic.ionic",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint"
  ]
}
```

#### **Configurações do Workspace**

```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.suggest.autoImports": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  }
}
```

---

## 📁 Estrutura de Pastas

### **🗂️ Organização Detalhada**

```
src/app/
├── 📁 core/                    # Funcionalidades principais
│   ├── services/               # Serviços singleton
│   ├── guards/                 # Route guards
│   ├── interceptors/           # HTTP interceptors
│   └── models/                 # Interfaces principais
│
├── 📁 features/                # Módulos de funcionalidade
│   ├── auth/                   # Sistema de autenticação
│   │   ├── pages/              # Páginas do módulo
│   │   ├── services/           # Serviços específicos
│   │   ├── models/             # Modelos do domínio
│   │   └── auth.module.ts      # Módulo principal
│   │
│   ├── workouts/               # Sistema de treinos
│   ├── exercises/              # Biblioteca de exercícios
│   └── analytics/              # Sistema de analytics
│
├── 📁 shared/                  # Componentes compartilhados
│   ├── components/             # Componentes reutilizáveis
│   ├── pipes/                  # Pipes customizados
│   ├── directives/             # Diretivas personalizadas
│   └── utils/                  # Utilitários
│
└── 📁 layout/                  # Layout e navegação
    ├── tabs/                   # Navegação principal
    └── header/                 # Header global
```

### **📝 Convenções de Nomenclatura**

```typescript
// Arquivos
feature.component.ts        // Componentes
feature.service.ts         // Serviços
feature.model.ts          // Modelos
feature.guard.ts          // Guards
feature.pipe.ts           // Pipes
feature.directive.ts      // Diretivas

// Classes
export class FeatureComponent { }     // PascalCase
export class FeatureService { }       // PascalCase
export interface FeatureModel { }     // PascalCase

// Variáveis e funções
const featureData = { };              // camelCase
function getFeatureData() { }         // camelCase

// Constantes
const FEATURE_CONSTANTS = { };        // UPPER_SNAKE_CASE
```

---

## 🎨 Padrões de Código

### **📐 Estrutura de Componentes**

```typescript
@Component({
  selector: 'app-feature',
  templateUrl: './feature.component.html',
  styleUrls: ['./feature.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush  // Performance
})
export class FeatureComponent implements OnInit, OnDestroy {
  // 1. Propriedades públicas
  @Input() data: FeatureData | null = null;
  @Output() action = new EventEmitter<string>();
  
  // 2. Propriedades privadas
  private readonly destroy$ = new Subject<void>();
  
  // 3. Constructor com DI
  constructor(
    private readonly featureService: FeatureService,
    private readonly cdr: ChangeDetectorRef
  ) {}
  
  // 4. Lifecycle hooks
  ngOnInit(): void {
    this.loadData();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // 5. Métodos públicos
  onAction(): void {
    this.action.emit('action-performed');
  }
  
  // 6. Métodos privados
  private loadData(): void {
    this.featureService.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.data = data;
        this.cdr.markForCheck();
      });
  }
}
```

### **🔧 Estrutura de Serviços**

```typescript
@Injectable({
  providedIn: 'root'  // Singleton global
})
export class FeatureService {
  // 1. Subjects privados
  private readonly dataSubject = new BehaviorSubject<FeatureData[]>([]);
  
  // 2. Observables públicos (readonly)
  public readonly data$ = this.dataSubject.asObservable();
  
  // 3. Constructor com DI
  constructor(
    private readonly http: HttpClient,
    private readonly storage: StorageService
  ) {
    this.initialize();
  }
  
  // 4. Métodos públicos
  async getData(): Promise<FeatureData[]> {
    try {
      const data = await this.storage.get('feature-data');
      return data || [];
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }
  
  updateData(data: FeatureData[]): void {
    this.dataSubject.next(data);
    this.saveToStorage(data);
  }
  
  // 5. Métodos privados
  private initialize(): void {
    this.loadFromStorage();
  }
  
  private async saveToStorage(data: FeatureData[]): Promise<void> {
    await this.storage.set('feature-data', data);
  }
}
```

### **🏗️ Estrutura de Modelos**

```typescript
// Base interface
export interface BaseModel {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// Feature model
export interface FeatureData extends BaseModel {
  readonly name: string;
  readonly description?: string;
  readonly isActive: boolean;
  readonly metadata: FeatureMetadata;
}

export interface FeatureMetadata {
  readonly tags: string[];
  readonly priority: 'low' | 'medium' | 'high';
  readonly category: FeatureCategory;
}

export enum FeatureCategory {
  WORKOUT = 'workout',
  EXERCISE = 'exercise',
  ANALYTICS = 'analytics'
}

// DTOs (Data Transfer Objects)
export interface CreateFeatureRequest {
  readonly name: string;
  readonly description?: string;
  readonly category: FeatureCategory;
}

export interface UpdateFeatureRequest extends Partial<CreateFeatureRequest> {
  readonly id: string;
}
```

---

## 🧪 Testes

### **🔬 Estratégia de Testes**

```typescript
// 1. Teste de Componente
describe('FeatureComponent', () => {
  let component: FeatureComponent;
  let fixture: ComponentFixture<FeatureComponent>;
  let mockService: jasmine.SpyObj<FeatureService>;
  
  beforeEach(async () => {
    const spy = jasmine.createSpyObj('FeatureService', ['getData']);
    
    await TestBed.configureTestingModule({
      declarations: [FeatureComponent],
      providers: [
        { provide: FeatureService, useValue: spy }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(FeatureComponent);
    component = fixture.componentInstance;
    mockService = TestBed.inject(FeatureService) as jasmine.SpyObj<FeatureService>;
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('should load data on init', () => {
    mockService.getData.and.returnValue(of(mockData));
    
    component.ngOnInit();
    
    expect(mockService.getData).toHaveBeenCalled();
    expect(component.data).toEqual(mockData);
  });
});

// 2. Teste de Serviço
describe('FeatureService', () => {
  let service: FeatureService;
  let httpMock: HttpTestingController;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FeatureService]
    });
    
    service = TestBed.inject(FeatureService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  
  it('should fetch data', () => {
    const mockData = [{ id: '1', name: 'Test' }];
    
    service.getData().subscribe(data => {
      expect(data).toEqual(mockData);
    });
    
    const req = httpMock.expectOne('/api/features');
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });
});
```

### **🎯 Cobertura de Testes**

```bash
# Executar testes com cobertura
npm run test:coverage

# Alvos de cobertura
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%
```

---

## 📱 Mobile Development

### **📋 Setup Android**

```bash
# 1. Instalar Android Studio
# 2. Configurar SDK paths
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# 3. Adicionar plataforma
ionic cap add android

# 4. Sincronizar código
ionic cap sync android

# 5. Abrir no Android Studio
ionic cap open android
```

### **🍎 Setup iOS (macOS apenas)**

```bash
# 1. Instalar Xcode via App Store
# 2. Instalar iOS simulators

# 3. Adicionar plataforma
ionic cap add ios

# 4. Sincronizar código
ionic cap sync ios

# 5. Abrir no Xcode
ionic cap open ios
```

### **🔧 Configuração do Capacitor**

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fitsync.app',
  appName: 'FitSync Pro',
  webDir: 'dist/fitsync',
  bundledWebRuntime: false,
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#E6FE58'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#E6FE58',
      showSpinner: false
    }
  }
};

export default config;
```

---

## 🔄 Estado e Dados

### **📊 Gestão de Estado**

```typescript
// 1. Service com BehaviorSubject
@Injectable()
export class StateService {
  private readonly stateSubject = new BehaviorSubject<AppState>(initialState);
  public readonly state$ = this.stateSubject.asObservable();
  
  updateState(updates: Partial<AppState>): void {
    const currentState = this.stateSubject.value;
    const newState = { ...currentState, ...updates };
    this.stateSubject.next(newState);
  }
}

// 2. Component subscription
export class FeatureComponent {
  constructor(private stateService: StateService) {}
  
  ngOnInit() {
    this.stateService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        // Handle state changes
      });
  }
}
```

### **💾 Persistência de Dados**

```typescript
// Storage abstraction
@Injectable()
export class StorageService {
  private storage: Storage | null = null;
  
  async init(): Promise<void> {
    this.storage = await this.ionicStorage.create();
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    await this.storage?.set(key, value);
  }
  
  async get<T>(key: string): Promise<T | null> {
    return await this.storage?.get(key) || null;
  }
  
  async remove(key: string): Promise<void> {
    await this.storage?.remove(key);
  }
}
```

---

## 🎨 Styling Guide

### **🌈 Sistema de Design**

```scss
// Design tokens
:root {
  // Cores principais
  --fitsync-primary: #E6FE58;
  --fitsync-secondary: #141414;
  --fitsync-accent: #40E0D0;
  
  // Tipografia
  --font-primary: 'Inter', sans-serif;
  --font-display: 'Outfit', sans-serif;
  
  // Espaçamentos
  --spacing-xs: 0.5rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  
  // Bordas
  --border-radius-sm: 8px;
  --border-radius-md: 12px;
  --border-radius-lg: 16px;
}
```

### **🧱 Componentes CSS**

```scss
// Mixin para cards
@mixin fitsync-card {
  background: var(--fitsync-card-background);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--fitsync-shadow-sm);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: var(--fitsync-shadow-hover);
    transform: translateY(-2px);
  }
}

// Classes utilitárias
.fitsync-card {
  @include fitsync-card;
}

.fitsync-text-primary {
  color: var(--fitsync-text-primary);
}

.fitsync-spacing-md {
  margin: var(--spacing-md);
}
```

---

## 🚀 Deploy e CI/CD

### **🌐 Build de Produção**

```bash
# Web build
ionic build --prod

# Android build
ionic cap build android --prod

# iOS build  
ionic cap build ios --prod
```

### **📦 GitHub Actions**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

---

**Este guia é um documento vivo e deve ser atualizado conforme o projeto evolui.**

**Desenvolvido com ❤️ pela FitSync Team**
