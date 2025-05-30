import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { JsonDataService, ExerciseData } from '../services/json-data.service';
import { NavigationService } from '../services/navigation.service';
import { StorageService } from '../services/storage.service';

interface TreinoDeHoje {
  id: string;
  nome: string;
  duracao: string; // Changed from duracaoEstimada to match template
  exercicios: ExerciseData[];
  tipo: string; // Added for getIconForTreinoType
  descricao: string; // Added for template
  calorias: number; // Added for template
  grupoMuscular: string;
  dificuldade: string;
  concluido: boolean;
}

@Component({
  selector: 'app-plano-hoje',
  templateUrl: './plano-hoje.page.html',
  styleUrls: ['./plano-hoje.page.scss'],
  standalone: false
})
export class PlanoHojePage implements OnInit {
  treinos: TreinoDeHoje[] = [];
  dataHoje: string = '';
  diaDaSemana: string = '';
  loading: boolean = true;
  progressoGeral: number = 0;
  metaDiaria: number = 3;
  exerciciosCompletos: number = 0;

  diasSemana = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

  constructor(
    private router: Router,
    private jsonDataService: JsonDataService,
    private navigationService: NavigationService,
    private storageService: StorageService
  ) {}

  async ngOnInit() {
    await this.carregarDadosHoje();
    await this.carregarProgresso();
  }

  async carregarDadosHoje() {
    this.loading = true;
    
    // Configurar data de hoje
    const hoje = new Date();
    this.dataHoje = hoje.toLocaleDateString('pt-BR');
    this.diaDaSemana = this.diasSemana[hoje.getDay()];
    
    try {
      // Carregar dados dos exercícios
      const dadosFitness = await this.jsonDataService.getFitnessData();
      
      // Simular treino do dia baseado no dia da semana
      if (dadosFitness && dadosFitness.exercises) {
        const planoHoje = this.gerarPlanoHoje(dadosFitness.exercises, hoje.getDay());
        this.treinos = planoHoje;
      }
      
    } catch (error) {
      console.error('Erro ao carregar plano de hoje:', error);
    }
    
    this.loading = false;
  }

  private gerarPlanoHoje(exercicios: ExerciseData[], diaSemana: number): TreinoDeHoje[] {
    // Lógica simples para gerar treino baseado no dia da semana
    const gruposPorDia = [
      'chest', // Domingo - Peito
      'back',  // Segunda - Costas
      'legs',  // Terça - Pernas
      'shoulders', // Quarta - Ombros
      'arms',  // Quinta - Braços
      'core',  // Sexta - Core
      'cardio' // Sábado - Cardio
    ];

    const grupoHoje = gruposPorDia[diaSemana];
    const exerciciosDoDia = exercicios.filter(ex => ex.muscleGroup === grupoHoje).slice(0, 3);

    return exerciciosDoDia.map((exercicio, index) => ({
      id: `treino_${index}_${Date.now()}`,
      nome: exercicio.name,
      duracao: `${Math.floor(Math.random() * 20) + 15} min`, // String format
      exercicios: [exercicio],
      tipo: exercicio.muscleGroup || 'fitness',
      descricao: (exercicio.instructions && exercicio.instructions.length > 0) 
        ? exercicio.instructions[0] 
        : 'Treino focado em força e resistência',
      calorias: Math.floor(Math.random() * 200) + 150, // 150-350 cal
      grupoMuscular: exercicio.muscleGroup,
      dificuldade: exercicio.difficulty || 'intermediate',
      concluido: false
    }));
  }

  async carregarProgresso() {
    try {
      const progresso = (await this.storageService.get('progresso_diario') as Record<string, number>) || {};
      const hoje = new Date().toDateString();
      
      this.exerciciosCompletos = progresso[hoje] || 0;
      this.progressoGeral = Math.min((this.exerciciosCompletos / this.metaDiaria) * 100, 100);
    } catch (error) {
      console.error('Erro ao carregar progresso:', error);
    }
  }

  async iniciarTreino(treino: TreinoDeHoje) {
    // Marcar treino como iniciado
    treino.concluido = true;
    
    // Atualizar progresso
    this.exerciciosCompletos++;
    this.progressoGeral = Math.min((this.exerciciosCompletos / this.metaDiaria) * 100, 100);
    
    // Salvar progresso
    await this.salvarProgresso();
    
    // Navegar para detalhes do exercício
    if (treino.exercicios.length > 0) {
      this.navigationService.navigateTo('/detalhe/' + treino.exercicios[0].id);
    }
  }

  async salvarProgresso() {
    try {
      const progresso = (await this.storageService.get('progresso_diario') as Record<string, number>) || {};
      const hoje = new Date().toDateString();
      progresso[hoje] = this.exerciciosCompletos;
      await this.storageService.set('progresso_diario', progresso);
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
    }
  }

  voltar() {
    this.navigationService.goBack();
  }

  getDificuldadeCor(dificuldade: string): string {
    switch (dificuldade.toLowerCase()) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning'; 
      case 'advanced': return 'danger';
      default: return 'medium';
    }
  }

  getGrupoMusculasIcon(grupo: string): string {
    switch (grupo) {
      case 'chest': return 'fitness-outline';
      case 'back': return 'arrow-back-circle-outline';
      case 'legs': return 'walk-outline';
      case 'shoulders': return 'triangle-outline';
      case 'arms': return 'barbell-outline';
      case 'core': return 'nuclear-outline';
      case 'cardio': return 'heart-outline';
      default: return 'dumbbell-outline';
    }
  }

  getProgressOffset(): number {
    const circumference = 2 * Math.PI * 54; // 54 is the radius
    const offset = circumference - (this.progressoGeral / 100) * circumference;
    return offset;
  }

  getIconForTreinoType(tipo: string): string {
    switch (tipo?.toLowerCase()) {
      case 'cardio': return 'heart-outline';
      case 'forca': 
      case 'strength': return 'barbell-outline';
      case 'flexibilidade': 
      case 'flexibility': return 'body-outline';
      case 'resistencia': 
      case 'endurance': return 'timer-outline';
      case 'yoga': return 'leaf-outline';
      case 'pilates': return 'ellipse-outline';
      default: return 'fitness-outline';
    }
  }

  analisarProgresso() {
    this.navigationService.navigateTo('/analisar-progresso');
  }

  continuarTreino() {
    const proximoTreino = this.treinos.find(t => !t.concluido);
    if (proximoTreino) {
      this.iniciarTreino(proximoTreino);
    }
  }

  getMotivacaoIcon(): string {
    if (this.progressoGeral >= 100) {
      return 'trophy-outline';
    } else if (this.progressoGeral >= 50) {
      return 'medal-outline';
    } else {
      return 'flame-outline';
    }
  }

  getMensagemMotivacao(): string {
    if (this.progressoGeral >= 100) {
      return '🎉 Parabéns! Meta atingida!';
    } else if (this.progressoGeral >= 75) {
      return 'Quase lá! Continue assim!';
    } else if (this.progressoGeral >= 50) {
      return 'Você está indo bem!';
    } else if (this.progressoGeral > 0) {
      return 'Bom começo! Vamos continuar!';
    } else {
      return 'Hora de começar o treino!';
    }
  }

  getDescricaoProgresso(): string {
    const restantes = this.metaDiaria - this.exerciciosCompletos;
    if (this.progressoGeral >= 100) {
      return 'Você superou suas expectativas hoje!';
    } else if (restantes === 1) {
      return `Falta apenas ${restantes} exercício para sua meta.`;
    } else if (restantes > 1) {
      return `Faltam ${restantes} exercícios para sua meta diária.`;
    } else {
      return 'Meta do dia alcançada com sucesso!';
    }
  }
}
