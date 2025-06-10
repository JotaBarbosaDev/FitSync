# 🔗 FitSync API Documentation

## 📡 **Visão Geral da API**

### **Arquitetura**
- **Tipo**: RESTful API
- **Formato**: JSON
- **Autenticação**: JWT + Refresh Tokens
- **Versionamento**: `/api/v1/`
- **Base URL**: `https://api.fitsync.app/v1`

---

## 🔐 **Autenticação**

### **Endpoints de Auth**
```typescript
// Login
POST /auth/login
Body: { email: string, password: string }
Response: { token: string, refreshToken: string, user: User }

// Registro
POST /auth/register  
Body: { name: string, email: string, password: string, profile: UserProfile }
Response: { token: string, user: User }

// Refresh Token
POST /auth/refresh
Body: { refreshToken: string }
Response: { token: string }

// Logout
POST /auth/logout
Headers: { Authorization: "Bearer <token>" }
Response: { success: boolean }
```

### **Headers Obrigatórios**
```typescript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json",
  "X-App-Version": "1.0.0"
}
```

---

## 👤 **Usuários**

### **Modelo de Usuário**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  profile: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfile {
  age?: number;
  height?: number; // cm
  weight?: number; // kg
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  preferences: UserPreferences;
}
```

### **Endpoints de Usuário**
```typescript
// Obter perfil
GET /users/profile
Response: User

// Atualizar perfil
PUT /users/profile
Body: Partial<UserProfile>
Response: User

// Estatísticas do usuário
GET /users/stats
Response: UserStats
```

---

## 🏋️ **Exercícios**

### **Modelo de Exercício**
```typescript
interface Exercise {
  id: string;
  name: string;
  description: string;
  muscleGroups: MuscleGroup[];
  equipment: Equipment[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  tips: string[];
  imageUrl?: string;
  videoUrl?: string;
  variations: ExerciseVariation[];
}
```

### **Endpoints de Exercícios**
```typescript
// Listar exercícios
GET /exercises
Query: { 
  muscleGroup?: string, 
  equipment?: string, 
  difficulty?: string,
  page?: number,
  limit?: number 
}
Response: { exercises: Exercise[], pagination: Pagination }

// Buscar exercícios
GET /exercises/search?q={query}
Response: { exercises: Exercise[] }

// Detalhes do exercício
GET /exercises/{id}
Response: Exercise

// Exercícios favoritos
GET /exercises/favorites
Response: { exercises: Exercise[] }

// Adicionar aos favoritos
POST /exercises/{id}/favorite
Response: { success: boolean }
```

---

## 💪 **Treinos**

### **Modelo de Treino**
```typescript
interface Workout {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  estimatedDuration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  muscleGroups: MuscleGroup[];
  isTemplate: boolean;
  createdBy: string;
  createdAt: Date;
}

interface WorkoutExercise {
  exerciseId: string;
  exercise: Exercise;
  sets: ExerciseSet[];
  restTime: number; // seconds
  notes?: string;
}

interface ExerciseSet {
  reps: number;
  weight?: number; // kg
  duration?: number; // seconds
  restTime?: number; // seconds
}
```

### **Endpoints de Treinos**
```typescript
// Listar treinos
GET /workouts
Query: { isTemplate?: boolean, page?: number, limit?: number }
Response: { workouts: Workout[], pagination: Pagination }

// Criar treino
POST /workouts
Body: CreateWorkoutRequest
Response: Workout

// Atualizar treino
PUT /workouts/{id}
Body: Partial<Workout>
Response: Workout

// Deletar treino
DELETE /workouts/{id}
Response: { success: boolean }

// Duplicar treino
POST /workouts/{id}/duplicate
Response: Workout
```

---

## 📊 **Sessões de Treino**

### **Modelo de Sessão**
```typescript
interface WorkoutSession {
  id: string;
  workoutId: string;
  workout: Workout;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  exercises: SessionExercise[];
  totalDuration?: number; // seconds
  caloriesBurned?: number;
  notes?: string;
}

interface SessionExercise {
  exerciseId: string;
  sets: CompletedSet[];
  notes?: string;
}

interface CompletedSet {
  reps: number;
  weight?: number;
  duration?: number;
  completedAt: Date;
  effort?: number; // 1-10 scale
}
```

### **Endpoints de Sessões**
```typescript
// Iniciar sessão
POST /sessions
Body: { workoutId: string }
Response: WorkoutSession

// Atualizar sessão
PUT /sessions/{id}
Body: Partial<WorkoutSession>
Response: WorkoutSession

// Finalizar sessão
POST /sessions/{id}/complete
Body: { notes?: string, rating?: number }
Response: WorkoutSession

// Histórico de sessões
GET /sessions
Query: { 
  startDate?: string, 
  endDate?: string, 
  status?: string,
  page?: number, 
  limit?: number 
}
Response: { sessions: WorkoutSession[], pagination: Pagination }
```

---

## 📈 **Analytics e Progresso**

### **Endpoints de Analytics**
```typescript
// Estatísticas gerais
GET /analytics/overview
Query: { period?: '7d' | '30d' | '90d' | '1y' }
Response: AnalyticsOverview

// Progresso por exercício
GET /analytics/exercises/{exerciseId}/progress
Response: ExerciseProgress

// Evolução do peso corporal
GET /analytics/weight-progress
Response: WeightProgress[]

// Métricas de volume
GET /analytics/volume
Query: { startDate?: string, endDate?: string }
Response: VolumeMetrics

// Recordes pessoais
GET /analytics/personal-records
Response: PersonalRecord[]
```

### **Modelos de Analytics**
```typescript
interface AnalyticsOverview {
  totalWorkouts: number;
  totalDuration: number;
  totalVolume: number;
  caloriesBurned: number;
  averageWorkoutDuration: number;
  workoutFrequency: number;
  muscleGroupDistribution: MuscleGroupStat[];
}

interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  recordType: 'max_weight' | 'max_reps' | 'max_volume';
  value: number;
  achievedAt: Date;
  previousRecord?: number;
}
```

---

## 📅 **Planos de Treino**

### **Modelo de Plano**
```typescript
interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  duration: number; // weeks
  workoutsPerWeek: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  schedule: PlanSchedule[];
  isActive: boolean;
  createdAt: Date;
}

interface PlanSchedule {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  workoutId: string;
  workout: Workout;
}
```

### **Endpoints de Planos**
```typescript
// Listar planos
GET /plans
Response: { plans: WorkoutPlan[] }

// Criar plano
POST /plans
Body: CreatePlanRequest
Response: WorkoutPlan

// Ativar plano
POST /plans/{id}/activate
Response: { success: boolean }

// Plano ativo
GET /plans/active
Response: WorkoutPlan | null

// Progresso do plano
GET /plans/{id}/progress
Response: PlanProgress
```

---

## 🔔 **Notificações**

### **Endpoints de Notificações**
```typescript
// Configurações de notificação
GET /notifications/settings
Response: NotificationSettings

// Atualizar configurações
PUT /notifications/settings
Body: Partial<NotificationSettings>
Response: NotificationSettings

// Histórico de notificações
GET /notifications
Response: { notifications: Notification[] }

// Marcar como lida
POST /notifications/{id}/read
Response: { success: boolean }
```

---

## 📱 **Sincronização de Dados**

### **Endpoints de Sync**
```typescript
// Status de sincronização
GET /sync/status
Response: SyncStatus

// Sincronizar dados
POST /sync
Body: { lastSyncAt?: Date }
Response: SyncResponse

// Backup de dados
GET /sync/backup
Response: UserDataBackup

// Restaurar backup
POST /sync/restore
Body: UserDataBackup
Response: { success: boolean }
```

---

## ⚠️ **Códigos de Erro**

### **HTTP Status Codes**
```typescript
200 // OK - Sucesso
201 // Created - Recurso criado
400 // Bad Request - Dados inválidos
401 // Unauthorized - Token inválido/expirado
403 // Forbidden - Sem permissão
404 // Not Found - Recurso não encontrado
422 // Unprocessable Entity - Validação falhou
429 // Too Many Requests - Rate limit
500 // Internal Server Error - Erro interno
503 // Service Unavailable - Serviço indisponível
```

### **Formato de Erro**
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
  }
}
```

---

## 🚀 **Rate Limiting**

### **Limites por Endpoint**
- **Auth**: 5 req/min por IP
- **General**: 100 req/min por usuário
- **Analytics**: 30 req/min por usuário
- **File Upload**: 10 req/min por usuário

### **Headers de Rate Limit**
```typescript
{
  "X-RateLimit-Limit": "100",
  "X-RateLimit-Remaining": "95",
  "X-RateLimit-Reset": "1640995200"
}
```

---

## 🔧 **Ambiente de Desenvolvimento**

### **Base URLs**
- **Produção**: `https://api.fitsync.app/v1`
- **Staging**: `https://api-staging.fitsync.app/v1`
- **Desenvolvimento**: `http://localhost:3000/v1`

### **Autenticação de Teste**
```typescript
// Usuário de teste
{
  "email": "test@fitsync.app",
  "password": "Test123!",
  "token": "dev_token_12345"
}
```

---

*Documentação atualizada em: Junho 2025*
*Versão da API: v1.0.0*
