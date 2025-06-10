# 🤝 Contributing to FitSync

Obrigado por considerar contribuir para o FitSync! Este documento fornece diretrizes para contribuições efetivas.

## 📋 Tipos de Contribuições

Aceitamos os seguintes tipos de contribuições:

- 🐛 **Bug Reports** - Relatar problemas encontrados
- ✨ **Feature Requests** - Sugerir novas funcionalidades
- 🔧 **Code Contributions** - Implementar correções ou features
- 📚 **Documentation** - Melhorar documentação
- 🎨 **Design Improvements** - Aprimorar UI/UX
- 🧪 **Tests** - Adicionar ou melhorar testes
- 🌐 **Translations** - Adicionar suporte a novos idiomas

## 🚀 Como Contribuir

### 1. **Fork e Clone**

```bash
# 1. Fork o repositório no GitHub
# 2. Clone sua fork
git clone https://github.com/SEU-USERNAME/fitsync.git
cd fitsync

# 3. Adicione o repositório original como upstream
git remote add upstream https://github.com/ORIGINAL-OWNER/fitsync.git
```

### 2. **Configurar Ambiente**

```bash
# Instalar dependências
npm ci

# Verificar se tudo está funcionando
npm test
npm run lint
npm run build
```

### 3. **Criar Branch de Feature**

```bash
# Criar branch a partir da develop
git checkout -b feature/nome-da-funcionalidade

# Ou para bug fixes
git checkout -b bugfix/nome-do-bug

# Ou para documentação
git checkout -b docs/nome-da-melhoria
```

### 4. **Implementar Mudanças**

- Siga os [padrões de código](#-padrões-de-código)
- Adicione testes para suas mudanças
- Mantenha commits pequenos e focados
- Use mensagens de commit descritivas

### 5. **Testar Suas Mudanças**

```bash
# Executar todos os testes
npm test

# Verificar linting
npm run lint

# Testar build
npm run build

# Testar no dispositivo (se aplicável)
ionic cap run android
```

### 6. **Submeter Pull Request**

```bash
# Push da sua branch
git push origin feature/nome-da-funcionalidade

# Criar PR no GitHub com descrição detalhada
```

## 📝 Padrões de Código

### **🏗️ Estrutura de Commits**

Usamos [Conventional Commits](https://conventionalcommits.org/):

```bash
# Formato
<type>(<scope>): <subject>

# Exemplos
feat(auth): add biometric authentication
fix(workouts): resolve timer synchronization issue
docs(readme): update installation instructions
style(home): improve responsive layout
test(services): add unit tests for WorkoutService
refactor(storage): optimize data persistence layer
```

#### **Tipos de Commit**

- `feat` - Nova funcionalidade
- `fix` - Correção de bug
- `docs` - Mudanças na documentação
- `style` - Mudanças de formatação/estilo
- `refactor` - Refatoração de código
- `test` - Adição ou correção de testes
- `chore` - Mudanças de build, CI, etc.

### **🎨 Padrões de Código TypeScript**

```typescript
// ✅ BOM - Use interfaces para tipos de dados
interface UserProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly preferences: UserPreferences;
}

// ✅ BOM - Use readonly para propriedades imutáveis
export class WorkoutService {
  private readonly storage: StorageService;
  
  constructor(storage: StorageService) {
    this.storage = storage;
  }
}

// ✅ BOM - Use async/await em vez de promises
async loadUserData(): Promise<UserProfile | null> {
  try {
    return await this.storage.get('user-profile');
  } catch (error) {
    console.error('Failed to load user data:', error);
    return null;
  }
}

// ❌ RUIM - Não use any
const userData: any = await this.loadData();

// ✅ BOM - Use tipos específicos
const userData: UserProfile | null = await this.loadUserData();
```

### **🧩 Padrões de Componentes**

```typescript
// ✅ BOM - Componente bem estruturado
@Component({
  selector: 'app-workout-card',
  templateUrl: './workout-card.component.html',
  styleUrls: ['./workout-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkoutCardComponent implements OnInit, OnDestroy {
  @Input() workout: Workout | null = null;
  @Output() workoutSelected = new EventEmitter<string>();
  
  private readonly destroy$ = new Subject<void>();
  
  constructor(private readonly cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    // Initialization logic
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  onSelectWorkout(): void {
    if (this.workout) {
      this.workoutSelected.emit(this.workout.id);
    }
  }
}
```

### **🎭 Padrões de Template**

```html
<!-- ✅ BOM - Template bem estruturado -->
<div class="workout-card" *ngIf="workout">
  <div class="workout-header">
    <h3 class="workout-title">{{ workout.name }}</h3>
    <span class="workout-duration">{{ workout.duration }}min</span>
  </div>
  
  <div class="workout-content">
    <p class="workout-description">{{ workout.description }}</p>
    
    <div class="workout-stats">
      <span class="stat-item">
        <ion-icon name="fitness-outline"></ion-icon>
        {{ workout.exercises.length }} exercícios
      </span>
    </div>
  </div>
  
  <div class="workout-actions">
    <ion-button 
      expand="block" 
      (click)="onSelectWorkout()"
      [disabled]="!workout">
      Iniciar Treino
    </ion-button>
  </div>
</div>
```

### **🎨 Padrões de SCSS**

```scss
// ✅ BOM - Use variáveis CSS
.workout-card {
  background: var(--fitsync-card-background);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  
  // Use nesting moderadamente
  .workout-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);
    
    .workout-title {
      font-weight: 600;
      color: var(--fitsync-text-primary);
    }
  }
  
  // Use mixins para padrões repetidos
  @include fitsync-card-hover;
}

// ✅ BOM - Responsive design
@media (max-width: 768px) {
  .workout-card {
    padding: var(--spacing-sm);
  }
}
```

## 🧪 Padrões de Testes

### **🔬 Estrutura de Testes**

```typescript
describe('WorkoutService', () => {
  let service: WorkoutService;
  let mockStorage: jasmine.SpyObj<StorageService>;
  
  beforeEach(() => {
    const storageSpy = jasmine.createSpyObj('StorageService', ['get', 'set']);
    
    TestBed.configureTestingModule({
      providers: [
        WorkoutService,
        { provide: StorageService, useValue: storageSpy }
      ]
    });
    
    service = TestBed.inject(WorkoutService);
    mockStorage = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
  });
  
  describe('getWorkouts', () => {
    it('should return workouts from storage', async () => {
      // Arrange
      const mockWorkouts = [{ id: '1', name: 'Test Workout' }];
      mockStorage.get.and.returnValue(Promise.resolve(mockWorkouts));
      
      // Act
      const result = await service.getWorkouts();
      
      // Assert
      expect(result).toEqual(mockWorkouts);
      expect(mockStorage.get).toHaveBeenCalledWith('workouts');
    });
    
    it('should handle storage errors gracefully', async () => {
      // Arrange
      mockStorage.get.and.returnValue(Promise.reject(new Error('Storage error')));
      
      // Act & Assert
      await expectAsync(service.getWorkouts()).toBeRejectedWithError('Storage error');
    });
  });
});
```

## 📚 Diretrizes de Documentação

### **📝 Comentários no Código**

```typescript
/**
 * Manages workout data and synchronization
 * 
 * This service handles all workout-related operations including:
 * - Loading and saving workouts to local storage
 * - Synchronizing with remote API when available
 * - Managing workout state across the application
 */
@Injectable({
  providedIn: 'root'
})
export class WorkoutService {
  
  /**
   * Loads all workouts for the current user
   * 
   * @returns Promise resolving to array of user workouts
   * @throws {StorageError} When unable to access local storage
   */
  async loadWorkouts(): Promise<Workout[]> {
    // Implementation
  }
}
```

### **📖 README de Módulos**

Cada módulo principal deve ter um README explicando:

- Propósito do módulo
- Principais componentes/serviços
- Como usar/integrar
- Exemplos de código

## 🐛 Reportando Bugs

### **📋 Template de Bug Report**

```markdown
## 🐛 Descrição do Bug
Descrição clara e concisa do problema.

## 🔄 Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Role para baixo até '...'
4. Veja o erro

## ✅ Comportamento Esperado
Descrição do que deveria acontecer.

## 📱 Ambiente
- OS: [e.g. iOS 15, Android 12]
- Browser: [e.g. Chrome 95, Safari 15]
- Versão do App: [e.g. 1.0.0]

## 📸 Screenshots
Se aplicável, adicione screenshots do problema.

## ℹ️ Informações Adicionais
Qualquer contexto adicional sobre o problema.
```

## ✨ Solicitando Features

### **📋 Template de Feature Request**

```markdown
## 🎯 Resumo da Feature
Descrição clara e concisa da feature solicitada.

## 💡 Motivação
Por que esta feature seria útil? Que problema ela resolve?

## 📋 Descrição Detalhada
Descrição detalhada de como a feature deveria funcionar.

## 🎨 Mockups/Wireframes
Se aplicável, inclua mockups ou wireframes.

## 🚀 Prioridade
- [ ] Crítica
- [ ] Alta
- [ ] Média
- [ ] Baixa

## 🤔 Alternativas Consideradas
Descreva alternativas que você considerou.
```

## 🎯 Process de Review

### **👀 Code Review Checklist**

Antes de submeter um PR, verifique:

- [ ] Código segue padrões estabelecidos
- [ ] Testes cobrem as mudanças
- [ ] Documentação foi atualizada
- [ ] Build passa sem erros
- [ ] Linting passa sem warnings
- [ ] Performance não foi degradada
- [ ] Funcionalidade funciona em mobile

### **🔍 Review Guidelines**

Como reviewer:

- Seja construtivo e respeitoso
- Foque na qualidade do código, não na pessoa
- Explique o "porquê" dos comentários
- Aprove quando apropriado
- Teste as mudanças localmente quando possível

## 🏆 Reconhecimento

Contribuidores serão reconhecidos:

- 📝 **Contributors.md** - Lista de todos os contribuidores
- 🎖️ **GitHub Profile** - Contribuições aparecerão no seu perfil
- 📊 **Release Notes** - Principais contribuições destacadas
- 🌟 **Community** - Reconhecimento na comunidade

## 📞 Suporte

Precisando de ajuda?

- 💬 **GitHub Discussions** - Para perguntas gerais
- 🐛 **GitHub Issues** - Para bugs e features
- 📧 **Email** - team@fitsync.com para questões privadas

---

**Obrigado por contribuir para o FitSync! 🚀**

*Juntos, criamos uma experiência de fitness melhor para todos.*
