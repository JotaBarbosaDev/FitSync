import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { JsonDataService, ExerciseData } from '../services/json-data.service';
import { NavigationService } from '../services/navigation.service';
import { StorageService } from '../services/storage.service';

interface ExercicioPersonalizado {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  restTime: number;
  selected: boolean;
}

interface TreinoPersonalizado {
  id: string;
  nome: string;
  objetivo: string;
  nivel: string;
  tempo: number;
  diasSemana: string[];
  exercicios: ExercicioPersonalizado[];
  criadoEm: Date;
}

@Component({
  selector: 'app-personalizar-treino',
  templateUrl: './personalizar-treino.page.html',
  styleUrls: ['./personalizar-treino.page.scss'],
  standalone: false
})
export class PersonalizarTreinoPage implements OnInit {
  // Wizard State
  currentStep: number = 1;
  totalSteps: number = 4;

  // Forms
  informacoesForm!: FormGroup;
  exerciciosDisponies: ExercicioPersonalizado[] = [];
  exerciciosSelecionados: ExercicioPersonalizado[] = [];
  treinoPersonalizado!: TreinoPersonalizado;

  // Options
  objetivos = [
    { value: 'perda_peso', label: 'Perda de Peso', icon: 'flame-outline' },
    { value: 'ganho_massa', label: 'Ganho de Massa', icon: 'barbell-outline' },
    { value: 'resistencia', label: 'Resistência', icon: 'heart-outline' },
    { value: 'forca', label: 'Força', icon: 'fitness-outline' },
    { value: 'flexibilidade', label: 'Flexibilidade', icon: 'body-outline' },
    { value: 'maratona', label: 'Preparação Maratona', icon: 'walk-outline' }
  ];

  niveis = [
    { value: 'beginner', label: 'Iniciante', description: '0-6 meses de treino' },
    { value: 'intermediate', label: 'Intermediário', description: '6-24 meses de treino' },
    { value: 'advanced', label: 'Avançado', description: '2+ anos de treino' }
  ];

  tempos = [
    { value: 30, label: '30 minutos' },
    { value: 45, label: '45 minutos' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1h 30min' }
  ];

  diasSemana = [
    { value: 'segunda', label: 'Segunda-feira', short: 'SEG' },
    { value: 'terca', label: 'Terça-feira', short: 'TER' },
    { value: 'quarta', label: 'Quarta-feira', short: 'QUA' },
    { value: 'quinta', label: 'Quinta-feira', short: 'QUI' },
    { value: 'sexta', label: 'Sexta-feira', short: 'SEX' },
    { value: 'sabado', label: 'Sábado', short: 'SAB' },
    { value: 'domingo', label: 'Domingo', short: 'DOM' }
  ];

  categorias = [
    { value: 'chest', label: 'Peito', icon: 'fitness-outline' },
    { value: 'back', label: 'Costas', icon: 'arrow-back-circle-outline' },
    { value: 'legs', label: 'Pernas', icon: 'walk-outline' },
    { value: 'shoulders', label: 'Ombros', icon: 'triangle-outline' },
    { value: 'arms', label: 'Braços', icon: 'barbell-outline' },
    { value: 'core', label: 'Core', icon: 'nuclear-outline' },
    { value: 'cardio', label: 'Cardio', icon: 'heart-outline' }
  ];

  // Filters
  filtroCategoria: string = '';
  filtroDificuldade: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private jsonDataService: JsonDataService,
    private navigationService: NavigationService,
    private storageService: StorageService
  ) {
    this.inicializarForm();
    this.inicializarTreinoPersonalizado();
  }

  async ngOnInit() {
    await this.carregarExercicios();
  }

  inicializarForm() {
    this.informacoesForm = this.formBuilder.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      objetivo: ['', Validators.required],
      nivel: ['', Validators.required],
      tempo: [30, Validators.required],
      diasSemana: [[], Validators.required]
    });
  }

  inicializarTreinoPersonalizado() {
    this.treinoPersonalizado = {
      id: `treino_${Date.now()}`,
      nome: '',
      objetivo: '',
      nivel: '',
      tempo: 30,
      diasSemana: [],
      exercicios: [],
      criadoEm: new Date()
    };
  }

  async carregarExercicios() {
    try {
      const dadosFitness = await this.jsonDataService.getFitnessData();
      
      if (dadosFitness && dadosFitness.exercises) {
        this.exerciciosDisponies = dadosFitness.exercises.map((ex: ExerciseData) => ({
          id: ex.id,
          name: ex.name,
          category: ex.muscleGroup,
          difficulty: ex.difficulty || 'intermediate',
          sets: 3,
          reps: 12,
          weight: 0,
          duration: 0,
          restTime: 60,
          selected: false
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar exercícios:', error);
      this.apresentarToast('Erro ao carregar exercícios', 'danger');
    }
  }

  // Navegação do Wizard
  proximoPasso() {
    if (this.validarPassoAtual()) {
      this.currentStep++;
      this.atualizarTreinoPersonalizado();
    }
  }

  passoAnterior() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  irParaPasso(passo: number) {
    if (passo <= this.currentStep || this.validarPassosAnteriores(passo)) {
      this.currentStep = passo;
    }
  }

  validarPassoAtual(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.informacoesForm.valid;
      case 2:
        return this.informacoesForm.get('diasSemana')?.value.length > 0;
      case 3:
        return this.exerciciosSelecionados.length > 0;
      default:
        return true;
    }
  }

  validarPassosAnteriores(passo: number): boolean {
    for (let i = 1; i < passo; i++) {
      const stepAtual = this.currentStep;
      this.currentStep = i;
      if (!this.validarPassoAtual()) {
        this.currentStep = stepAtual;
        return false;
      }
    }
    this.currentStep = passo;
    return true;
  }

  atualizarTreinoPersonalizado() {
    const formValues = this.informacoesForm.value;
    
    this.treinoPersonalizado = {
      ...this.treinoPersonalizado,
      nome: formValues.nome,
      objetivo: formValues.objetivo,
      nivel: formValues.nivel,
      tempo: formValues.tempo,
      diasSemana: formValues.diasSemana,
      exercicios: this.exerciciosSelecionados
    };
  }

  // Gestão de Dias da Semana
  toggleDiaSemana(dia: string) {
    const diasSelecionados = this.informacoesForm.get('diasSemana')?.value || [];
    const index = diasSelecionados.indexOf(dia);
    
    if (index > -1) {
      diasSelecionados.splice(index, 1);
    } else {
      diasSelecionados.push(dia);
    }
    
    this.informacoesForm.patchValue({ diasSemana: diasSelecionados });
  }

  // Gestão de Exercícios
  toggleExercicio(exercicio: ExercicioPersonalizado) {
    exercicio.selected = !exercicio.selected;
    
    if (exercicio.selected) {
      this.exerciciosSelecionados.push({ ...exercicio });
    } else {
      this.exerciciosSelecionados = this.exerciciosSelecionados.filter(ex => ex.id !== exercicio.id);
    }
  }

  removerExercicio(exercicioId: string) {
    this.exerciciosSelecionados = this.exerciciosSelecionados.filter(ex => ex.id !== exercicioId);
    
    const exercicio = this.exerciciosDisponies.find(ex => ex.id === exercicioId);
    if (exercicio) {
      exercicio.selected = false;
    }
  }

  atualizarExercicio(exercicioId: string, campo: keyof ExercicioPersonalizado, valor: string | number) {
    const exercicio = this.exerciciosSelecionados.find(ex => ex.id === exercicioId);
    if (exercicio) {
      const numeroValor = Number(valor) || 0;
      switch (campo) {
        case 'sets':
          exercicio.sets = numeroValor;
          break;
        case 'reps':
          exercicio.reps = numeroValor;
          break;
        case 'weight':
          exercicio.weight = numeroValor;
          break;
        case 'duration':
          exercicio.duration = numeroValor;
          break;
        case 'restTime':
          exercicio.restTime = numeroValor;
          break;
      }
    }
  }

  get exerciciosFiltrados() {
    return this.exerciciosDisponies.filter(exercicio => {
      const categoriaMatch = !this.filtroCategoria || exercicio.category === this.filtroCategoria;
      const dificuldadeMatch = !this.filtroDificuldade || exercicio.difficulty === this.filtroDificuldade;
      return categoriaMatch && dificuldadeMatch;
    });
  }

  // Sugestões Inteligentes
  async aplicarSugestaoInteligente() {
    const objetivo = this.informacoesForm.get('objetivo')?.value;
    const nivel = this.informacoesForm.get('nivel')?.value;
    const tempo = this.informacoesForm.get('tempo')?.value;

    this.exerciciosSelecionados = [];
    
    // Resetar seleções
    this.exerciciosDisponies.forEach(ex => ex.selected = false);

    let exerciciosSugeridos: ExercicioPersonalizado[] = [];

    switch (objetivo) {
      case 'perda_peso':
        exerciciosSugeridos = this.sugerirExerciciosCardio(nivel, tempo);
        break;
      case 'ganho_massa':
        exerciciosSugeridos = this.sugerirExerciciosForca(nivel, tempo);
        break;
      case 'maratona':
        exerciciosSugeridos = this.sugerirExerciciosMaratona(nivel, tempo);
        break;
      default:
        exerciciosSugeridos = this.sugerirExerciciosEquilibrados(nivel, tempo);
    }

    // Aplicar sugestões
    exerciciosSugeridos.forEach(sugestao => {
      const exercicio = this.exerciciosDisponies.find(ex => ex.id === sugestao.id);
      if (exercicio) {
        exercicio.selected = true;
        this.exerciciosSelecionados.push({ 
          ...exercicio,
          sets: sugestao.sets,
          reps: sugestao.reps,
          weight: sugestao.weight,
          duration: sugestao.duration,
          restTime: sugestao.restTime
        });
      }
    });

    this.apresentarToast('Sugestões aplicadas com base no seu objetivo!', 'success');
  }

  private sugerirExerciciosCardio(nivel: string, tempo: number): ExercicioPersonalizado[] {
    const cardioExercicios = this.exerciciosDisponies.filter(ex => ex.category === 'cardio');
    const sets = nivel === 'beginner' ? 2 : nivel === 'intermediate' ? 3 : 4;
    const duration = Math.floor(tempo / sets);

    return cardioExercicios.slice(0, 3).map(ex => ({
      ...ex,
      sets,
      reps: 0,
      duration,
      restTime: 90
    }));
  }

  private sugerirExerciciosForca(nivel: string, tempo: number): ExercicioPersonalizado[] {
    const forcaExercicios = this.exerciciosDisponies.filter(ex => 
      ['chest', 'back', 'legs', 'shoulders', 'arms'].includes(ex.category)
    );
    
    const sets = nivel === 'beginner' ? 3 : nivel === 'intermediate' ? 4 : 5;
    const reps = nivel === 'beginner' ? 12 : nivel === 'intermediate' ? 10 : 8;

    return forcaExercicios.slice(0, Math.floor(tempo / 15)).map(ex => ({
      ...ex,
      sets,
      reps,
      weight: 0,
      restTime: 120
    }));
  }

  private sugerirExerciciosMaratona(nivel: string, tempo: number): ExercicioPersonalizado[] {
    const maratonaExercicios = this.exerciciosDisponies.filter(ex => 
      ['cardio', 'legs', 'core'].includes(ex.category)
    );
    
    const sets = nivel === 'beginner' ? 2 : 3;
    const duration = Math.floor(tempo / sets);

    return maratonaExercicios.slice(0, 4).map(ex => ({
      ...ex,
      sets,
      reps: ex.category === 'cardio' ? 0 : 15,
      duration: ex.category === 'cardio' ? duration : 0,
      restTime: 60
    }));
  }

  private sugerirExerciciosEquilibrados(nivel: string, _tempo: number): ExercicioPersonalizado[] {
    const exerciciosVariados = this.exerciciosDisponies.filter((ex, index) => index < 6);
    const sets = nivel === 'beginner' ? 3 : 4;
    const reps = 12;

    return exerciciosVariados.map(ex => ({
      ...ex,
      sets,
      reps,
      restTime: 90
    }));
  }

  // Finalização
  async finalizarTreino() {
    const loading = await this.loadingController.create({
      message: 'Criando seu treino personalizado...'
    });
    await loading.present();

    try {
      this.atualizarTreinoPersonalizado();
      
      // Salvar treino - converter para WorkoutPlan
      const treinosSalvos = await this.storageService.get('workout-plans') || [];
      
      // Converter TreinoPersonalizado para WorkoutPlan
      const workoutPlan = {
        id: this.treinoPersonalizado.id,
        name: this.treinoPersonalizado.nome,
        exercises: this.treinoPersonalizado.exercicios.map(ex => ({
          id: ex.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight || 0,
          muscleGroup: ex.category,
          equipment: ''
        })),
        difficulty: this.treinoPersonalizado.nivel,
        duration: this.treinoPersonalizado.tempo
      };
      
      treinosSalvos.push(workoutPlan);
      await this.storageService.set('workout-plans', treinosSalvos);

      await loading.dismiss();
      
      await this.apresentarSucesso();
      
    } catch (error) {
      await loading.dismiss();
      console.error('Erro ao salvar treino:', error);
      this.apresentarToast('Erro ao salvar treino', 'danger');
    }
  }

  async apresentarSucesso() {
    const alert = await this.alertController.create({
      header: 'Treino Criado!',
      message: `Seu treino "${this.treinoPersonalizado.nome}" foi criado com sucesso!`,
      buttons: [
        {
          text: 'Ver Treinos',
          handler: () => {
            this.navigationService.navigateTo('/lista');
          }
        },
        {
          text: 'Criar Outro',
          handler: () => {
            this.reiniciarWizard();
          }
        }
      ]
    });
    await alert.present();
  }

  reiniciarWizard() {
    this.currentStep = 1;
    this.inicializarForm();
    this.inicializarTreinoPersonalizado();
    this.exerciciosSelecionados = [];
    this.exerciciosDisponies.forEach(ex => ex.selected = false);
  }

  voltar() {
    this.navigationService.goBack();
  }

  async apresentarToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  // Utilitários
  getObjetivoIcon(objetivo: string): string {
    const obj = this.objetivos.find(o => o.value === objetivo);
    return obj ? obj.icon : 'fitness-outline';
  }

  getObjetivoLabel(): string {
    const objetivo = this.informacoesForm.get('objetivo')?.value;
    const obj = this.objetivos.find(o => o.value === objetivo);
    return obj ? obj.label : '';
  }

  getNivelLabel(): string {
    const nivel = this.informacoesForm.get('nivel')?.value;
    const niv = this.niveis.find(n => n.value === nivel);
    return niv ? niv.label : '';
  }

  getTempoLabel(): string {
    const tempo = this.informacoesForm.get('tempo')?.value;
    return tempo ? `${tempo} minutos` : '';
  }

  getDiasSemanaCount(): number {
    const dias = this.informacoesForm.get('diasSemana')?.value;
    return dias ? dias.length : 0;
  }

  getCategoriaIcon(categoria: string): string {
    const cat = this.categorias.find(c => c.value === categoria);
    return cat ? cat.icon : 'dumbbell-outline';
  }

  getDificuldadeCor(dificuldade: string): string {
    switch (dificuldade) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'danger';
      default: return 'medium';
    }
  }

  getStepLabel(step: number): string {
    const labels = {
      1: 'Informações',
      2: 'Cronograma',
      3: 'Exercícios',
      4: 'Revisão'
    };
    return labels[step as keyof typeof labels] || '';
  }

  getTrainingFrequencyAdvice(): string {
    const selectedDays = this.informacoesForm.get('diasSemana')?.value.length || 0;
    
    if (selectedDays === 0) return 'Selecione pelo menos 1 dia';
    if (selectedDays <= 2) return 'Ideal para iniciantes';
    if (selectedDays <= 4) return 'Frequência equilibrada';
    if (selectedDays <= 5) return 'Treino intenso';
    return 'Treino muito intenso - certifique-se de ter recuperação adequada';
  }

  getDifficultyLabel(difficulty: string): string {
    const labels = {
      'beginner': 'Iniciante',
      'intermediate': 'Intermediário',
      'advanced': 'Avançado'
    };
    return labels[difficulty as keyof typeof labels] || difficulty;
  }

  getEstimatedCalories(): number {
    const tempo = this.informacoesForm.get('tempo')?.value || 30;
    const numExercicios = this.exerciciosSelecionados.length;
    
    // Estimativa básica: ~8-12 calorias por minuto dependendo da intensidade
    const baseCalories = tempo * 10;
    const exerciseMultiplier = Math.min(numExercicios * 0.1 + 0.8, 1.5);
    
    return Math.round(baseCalories * exerciseMultiplier);
  }

  // Math object for template
  Math = Math;
}
