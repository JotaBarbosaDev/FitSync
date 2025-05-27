# FitSync - Planeamento da Aplicação

## 📋 Visão Geral

**FitSync** é uma aplicação móvel Ionic desenvolvida com Angular e TypeScript que permite aos utilizadores criar e gerir planos de treino completos. A aplicação segue uma hierarquia estruturada: **Planos → Dias → Treinos → Exercícios**.

### 🎨 Paleta de Cores
- **Cor Principal**: `#E6FE58` (Verde lima vibrante) - Para botões e destaques
- **Cor Secundária**: `#141414` (Preto escuro) - Para textos e elementos secundários
- **Cor de Fundo**: `#FFFFFF` (Branco) - Para fundos e espaçamentos

## 🏗️ Arquitetura da Aplicação

### Tecnologias Base
- **Ionic 8.0.0** com Angular 19.0.0
- **TypeScript** para tipagem forte
- **NgModules** para organização modular
- **Capacitor 7.0.1** para funcionalidades nativas
- **RxJS** para programação reativa

### Estrutura Hierárquica dos Dados
```
Usuario
└── Planos de Treino
    └── Dias da Semana
        └── Treinos
            └── Exercícios
```

## 📱 Funcionalidades Principais

### 🔐 Sistema de Autenticação
- **Registo de novos utilizadores**
- **Login/Logout**
- **Validação de credenciais**
- **Persistência de sessão**

### 📊 Gestão de Planos
- **Criar planos personalizados**
- **Editar planos existentes**
- **Eliminar planos**
- **Duplicar planos**
- **Visualizar progresso**

### 📅 Gestão de Dias
- **Definir dias da semana para treino**
- **Associar múltiplos treinos por dia**
- **Configurar dias de descanso**

### 🏋️ Gestão de Treinos
- **Criar treinos específicos**
- **Categorizar por tipo (Força, Cardio, Flexibilidade, etc.)**
- **Definir duração estimada**
- **Adicionar notas e observações**

### 💪 Gestão de Exercícios
- **Biblioteca de exercícios**
- **Exercícios personalizados**
- **Definir séries, repetições e peso**
- **Tempo de descanso entre séries**
- **Instruções e demonstrações**

## 🗂️ Estrutura de Ficheiros

### Páginas (Pages)
```
src/app/pages/
├── auth/
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── dashboard/
├── plans/
│   ├── plan-list/
│   ├── plan-create/
│   ├── plan-edit/
│   └── plan-detail/
├── days/
│   ├── day-list/
│   ├── day-create/
│   └── day-detail/
├── workouts/
│   ├── workout-list/
│   ├── workout-create/
│   ├── workout-edit/
│   └── workout-detail/
└── exercises/
    ├── exercise-list/
    ├── exercise-create/
    ├── exercise-edit/
    ├── exercise-detail/
    └── exercise-library/
```

### Serviços (Services)
```
src/app/services/
├── auth.service.ts
├── data.service.ts
├── plan.service.ts
├── day.service.ts
├── workout.service.ts
├── exercise.service.ts
├── storage.service.ts
└── notification.service.ts
```

### Modelos de Dados (Models)
```
src/app/models/
├── user.model.ts
├── plan.model.ts
├── day.model.ts
├── workout.model.ts
├── exercise.model.ts
├── set.model.ts
└── workout-session.model.ts
```

### Componentes Reutilizáveis
```
src/app/components/
├── plan-card/
├── workout-card/
├── exercise-card/
├── progress-chart/
├── timer/
├── rest-timer/
└── exercise-form/
```

## 📊 Modelos de Dados

### User Model
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  dateOfBirth?: Date;
  height?: number;
  weight?: number;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  goals?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Plan Model
```typescript
interface Plan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  duration: number; // semanas
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  days: Day[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Day Model
```typescript
interface Day {
  id: string;
  planId: string;
  dayOfWeek: number; // 0-6 (Domingo-Sábado)
  name: string;
  workouts: Workout[];
  isRestDay: boolean;
  notes?: string;
}
```

### Workout Model
```typescript
interface Workout {
  id: string;
  dayId: string;
  name: string;
  type: 'strength' | 'cardio' | 'flexibility' | 'mixed';
  estimatedDuration: number; // minutos
  exercises: Exercise[];
  restBetweenExercises: number; // segundos
  notes?: string;
  order: number;
}
```

### Exercise Model
```typescript
interface Exercise {
  id: string;
  workoutId: string;
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  sets: Set[];
  instructions?: string;
  demonstration?: string; // URL ou asset
  equipment?: string[];
  muscleGroups: string[];
  order: number;
}
```

### Set Model
```typescript
interface Set {
  id: string;
  exerciseId: string;
  type: 'normal' | 'warmup' | 'dropset' | 'superset';
  reps?: number;
  weight?: number;
  duration?: number; // para exercícios de tempo
  distance?: number; // para cardio
  restTime: number; // segundos
  completed: boolean;
  notes?: string;
}
```

## 🛠️ Serviços Principais

### AuthService
- `login(email: string, password: string): Observable<User>`
- `register(userData: RegisterData): Observable<User>`
- `logout(): void`
- `getCurrentUser(): Observable<User | null>`
- `isAuthenticated(): boolean`

### DataService
- `loadData(): Observable<any>`
- `saveData(data: any): Observable<boolean>`
- `exportData(): Observable<string>`
- `importData(data: string): Observable<boolean>`

### PlanService
- `getPlans(userId: string): Observable<Plan[]>`
- `createPlan(plan: Plan): Observable<Plan>`
- `updatePlan(plan: Plan): Observable<Plan>`
- `deletePlan(planId: string): Observable<boolean>`
- `duplicatePlan(planId: string): Observable<Plan>`

### WorkoutService
- `getWorkouts(dayId: string): Observable<Workout[]>`
- `createWorkout(workout: Workout): Observable<Workout>`
- `updateWorkout(workout: Workout): Observable<Workout>`
- `deleteWorkout(workoutId: string): Observable<boolean>`

### ExerciseService
- `getExercises(workoutId: string): Observable<Exercise[]>`
- `getExerciseLibrary(): Observable<Exercise[]>`
- `createExercise(exercise: Exercise): Observable<Exercise>`
- `updateExercise(exercise: Exercise): Observable<Exercise>`
- `deleteExercise(exerciseId: string): Observable<boolean>`

## 📁 Armazenamento Local (data.json)

### Estrutura do Ficheiro data.json
```json
{
  "users": [
    {
      "id": "user1",
      "email": "user@example.com",
      "name": "João Silva",
      "plans": ["plan1", "plan2"]
    }
  ],
  "plans": [
    {
      "id": "plan1",
      "userId": "user1",
      "name": "Plano Iniciante",
      "days": ["day1", "day2", "day3"]
    }
  ],
  "days": [
    {
      "id": "day1",
      "planId": "plan1",
      "dayOfWeek": 1,
      "workouts": ["workout1"]
    }
  ],
  "workouts": [
    {
      "id": "workout1",
      "dayId": "day1",
      "name": "Treino de Peito",
      "exercises": ["exercise1", "exercise2"]
    }
  ],
  "exercises": [
    {
      "id": "exercise1",
      "workoutId": "workout1",
      "name": "Supino Reto",
      "sets": ["set1", "set2", "set3"]
    }
  ],
  "sets": [
    {
      "id": "set1",
      "exerciseId": "exercise1",
      "reps": 12,
      "weight": 60,
      "restTime": 60
    }
  ],
  "exerciseLibrary": [
    {
      "id": "lib1",
      "name": "Supino Reto",
      "category": "chest",
      "instructions": "Deitar no banco...",
      "muscleGroups": ["peitoral", "triceps", "deltoides anterior"]
    }
  ]
}
```

## 🎯 Casos de Uso

### UC001 - Registo de Utilizador
**Ator**: Novo utilizador
**Pré-condições**: Aplicação instalada
**Fluxo Principal**:
1. Utilizador abre a aplicação
2. Seleciona "Criar Conta"
3. Preenche dados pessoais
4. Confirma registo
5. Sistema cria conta e autentica utilizador

### UC002 - Autenticação
**Ator**: Utilizador registado
**Pré-condições**: Conta criada
**Fluxo Principal**:
1. Utilizador insere credenciais
2. Sistema valida dados
3. Utilizador é redirecionado para dashboard

### UC003 - Criar Plano de Treino
**Ator**: Utilizador autenticado
**Pré-condições**: Sessão ativa
**Fluxo Principal**:
1. Utilizador acede à secção "Planos"
2. Seleciona "Criar Novo Plano"
3. Define nome, duração e objetivos
4. Sistema cria plano vazio
5. Utilizador pode adicionar dias

### UC004 - Adicionar Dia ao Plano
**Ator**: Utilizador autenticado
**Pré-condições**: Plano criado
**Fluxo Principal**:
1. Utilizador seleciona plano
2. Escolhe "Adicionar Dia"
3. Define dia da semana
4. Sistema associa dia ao plano

### UC005 - Criar Treino
**Ator**: Utilizador autenticado
**Pré-condições**: Dia criado
**Fluxo Principal**:
1. Utilizador seleciona dia
2. Escolhe "Adicionar Treino"
3. Define nome e tipo de treino
4. Sistema cria treino vazio

### UC006 - Adicionar Exercício
**Ator**: Utilizador autenticado
**Pré-condições**: Treino criado
**Fluxo Principal**:
1. Utilizador seleciona treino
2. Escolhe "Adicionar Exercício"
3. Seleciona da biblioteca ou cria novo
4. Define séries, repetições e peso
5. Sistema associa exercício ao treino

### UC007 - Executar Treino
**Ator**: Utilizador autenticado
**Pré-condições**: Treino com exercícios
**Fluxo Principal**:
1. Utilizador inicia treino
2. Sistema apresenta primeiro exercício
3. Utilizador executa série
4. Marca série como completa
5. Sistema inicia timer de descanso
6. Repete até concluir treino

## 🌐 API REST (Futura Implementação)

### Endpoints de Autenticação
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Endpoints de Planos
```
GET    /api/plans
POST   /api/plans
GET    /api/plans/:id
PUT    /api/plans/:id
DELETE /api/plans/:id
POST   /api/plans/:id/duplicate
```

### Endpoints de Dias
```
GET    /api/plans/:planId/days
POST   /api/plans/:planId/days
PUT    /api/days/:id
DELETE /api/days/:id
```

### Endpoints de Treinos
```
GET    /api/days/:dayId/workouts
POST   /api/days/:dayId/workouts
PUT    /api/workouts/:id
DELETE /api/workouts/:id
```

### Endpoints de Exercícios
```
GET    /api/workouts/:workoutId/exercises
POST   /api/workouts/:workoutId/exercises
PUT    /api/exercises/:id
DELETE /api/exercises/:id
GET    /api/exercises/library
```

## 🎨 Design e Interface

### Tema Principal
```scss
:root {
  --primary: #E6FE58;
  --secondary: #141414;
  --background: #FFFFFF;
  --surface: #F8F9FA;
  --text-primary: #141414;
  --text-secondary: #666666;
  --accent: #E6FE58;
  --success: #28A745;
  --warning: #FFC107;
  --danger: #DC3545;
}
```

### Componentes de UI
- **Botões primários**: Fundo `#E6FE58`, texto `#141414`
- **Botões secundários**: Contorno `#141414`, texto `#141414`
- **Cards**: Fundo branco com sombra sutil
- **Navegação**: Fundo `#141414`, ícones `#E6FE58`

## 🔧 Funcionalidades Adicionais

### 📊 Relatórios e Progresso
- Gráficos de progresso por exercício
- Histórico de treinos realizados
- Estatísticas semanais/mensais
- Comparação de performance

### ⏱️ Timer e Cronómetro
- Timer para descanso entre séries
- Cronómetro para exercícios de tempo
- Notificações sonoras

### 📱 Notificações
- Lembretes de treino
- Notificações de descanso
- Motivação diária

### 🔄 Sincronização
- Backup automático dos dados
- Exportação/importação de planos
- Partilha de treinos

### 🏆 Gamificação
- Sistema de conquistas
- Streaks de treino
- Níveis de progresso
- Desafios semanais

## 📋 Plano de Desenvolvimento

### Fase 1 - Base (2-3 semanas)
- [x] Configuração do projeto Ionic
- [ ] Sistema de autenticação
- [ ] Armazenamento local (data.json)
- [ ] Navegação básica

### Fase 2 - CRUD Básico (3-4 semanas)
- [ ] Gestão de planos
- [ ] Gestão de dias
- [ ] Gestão de treinos
- [ ] Gestão de exercícios

### Fase 3 - Execução de Treinos (2-3 semanas)
- [ ] Interface de execução
- [ ] Timer e cronómetro
- [ ] Marcação de progresso

### Fase 4 - Melhorias (2-3 semanas)
- [ ] Biblioteca de exercícios
- [ ] Relatórios básicos
- [ ] Exportação de dados

### Fase 5 - Funcionalidades Avançadas (3-4 semanas)
- [ ] Gráficos e estatísticas
- [ ] Notificações
- [ ] Gamificação
- [ ] Preparação para API REST

## 🧪 Estratégia de Testes

### Testes Unitários
- Serviços de dados
- Modelos de validação
- Lógica de negócio

### Testes de Integração
- Fluxos de autenticação
- CRUD operations
- Navegação entre páginas

### Testes E2E
- Jornada completa do utilizador
- Criação de plano completo
- Execução de treino

## 📦 Dependências Adicionais

```json
{
  "dependencies": {
    "@ionic/storage-angular": "^4.0.0",
    "chart.js": "^4.0.0",
    "date-fns": "^3.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}
```

## 🚀 Considerações Futuras

### Migração para Base de Dados
- PostgreSQL ou MongoDB
- API REST completa
- Sincronização cloud
- Autenticação JWT

### Funcionalidades Premium
- Planos personalizados por IA
- Vídeos de demonstração
- Coach virtual
- Integração com wearables

### Multiplataforma
- Versão web (PWA)
- Aplicação desktop (Electron)
- Sincronização cross-platform

---

**Nota**: Este documento será atualizado conforme o desenvolvimento da aplicação progride. Novas funcionalidades e melhorias serão documentadas em versões futuras.
