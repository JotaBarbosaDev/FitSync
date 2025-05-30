import { Component, OnInit } from '@angular/core';
import { JsonDataService } from '../services/json-data.service';
import { StorageService } from '../services/storage.service';
import { NavigationService } from '../services/navigation.service';

interface ChartData {
  label: string;
  value: number;
  date?: string;
  [key: string]: unknown; // Permite propriedades adicionais flexíveis
}

interface ConquistaRecente {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  data: string;
}

@Component({
  selector: 'app-analisar-progresso',
  templateUrl: './analisar-progresso.page.html',
  styleUrls: ['./analisar-progresso.page.scss'],
  standalone: false
})
export class AnalisarProgressoPage implements OnInit {
  // Dados do progresso
  progressoSemanal = {
    treinos: 0,
    meta: 5,
    percentual: 0
  };

  progressoMensal = {
    peso: { atual: 75, inicial: 78, meta: 70 },
    massa: { atual: 65, inicial: 62, meta: 68 },
    gordura: { atual: 15, inicial: 20, meta: 12 }
  };

  // Dados dos gráficos
  dadosGraficoPeso: ChartData[] = [];
  dadosGraficoTreinos: ChartData[] = [];
  dadosGraficoCaloriasSemana: ChartData[] = [];

  // Estatísticas gerais
  estatisticas = {
    totalTreinos: 0,
    totalCalorias: 0,
    tempoTotal: 0,
    melhorSequencia: 0,
    sequenciaAtual: 0
  };

  // Filtros de período
  periodoSelecionado = '30d';
  periodosDisponiveis = [
    { valor: '7d', label: '7 dias' },
    { valor: '30d', label: '30 dias' },
    { valor: '90d', label: '3 meses' },
    { valor: '365d', label: '1 ano' }
  ];

  // Conquistas recentes
  conquistasRecentes: ConquistaRecente[] = [];

  constructor(
    private jsonDataService: JsonDataService,
    private storageService: StorageService,
    private navigationService: NavigationService
  ) { }

  ngOnInit() {
    this.carregarDadosProgresso();
    this.gerarDadosGraficos();
    this.calcularEstatisticas();
    this.carregarConquistas();
  }

  async carregarDadosProgresso() {
    try {
      // Carregar dados salvos do progresso
      const progressoSalvo = await this.storageService.get('progressoUsuario');
      
      if (progressoSalvo) {
        this.progressoMensal = { ...this.progressoMensal, ...progressoSalvo };
      }

      // Simular progresso semanal baseado em treinos realizados
      const treinosRealizados = await this.storageService.get('treinosRealizados') || [];
      const treinosSemana = Array.isArray(treinosRealizados) ? treinosRealizados.filter((treino: { data: string }) => {
        const dataTreino = new Date(treino.data);
        const agora = new Date();
        const diferenca = agora.getTime() - dataTreino.getTime();
        return diferenca <= 7 * 24 * 60 * 60 * 1000; // 7 dias
      }) : [];

      this.progressoSemanal.treinos = treinosSemana.length;
      this.progressoSemanal.percentual = Math.min((this.progressoSemanal.treinos / this.progressoSemanal.meta) * 100, 100);

    } catch (error) {
      console.error('Erro ao carregar dados de progresso:', error);
    }
  }

  gerarDadosGraficos() {
    // Gerar dados simulados para os gráficos baseados no período
    const dias = this.periodoSelecionado === '7d' ? 7 : 
                 this.periodoSelecionado === '30d' ? 30 :
                 this.periodoSelecionado === '90d' ? 90 : 365;

    // Dados do gráfico de peso
    this.dadosGraficoPeso = [];
    const pesoInicial = this.progressoMensal.peso.inicial;
    const pesoAtual = this.progressoMensal.peso.atual;
    const variacao = (pesoAtual - pesoInicial) / dias;      for (let i = 0; i < dias; i += Math.ceil(dias / 10)) {
        const data = new Date();
        data.setDate(data.getDate() - (dias - i));
        this.dadosGraficoPeso.push({
          label: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          value: +(pesoInicial + (variacao * i) + (Math.random() - 0.5)).toFixed(1),
          peso: +(pesoInicial + (variacao * i) + (Math.random() - 0.5)).toFixed(1)
        });
      }

    // Dados do gráfico de treinos por semana
    this.dadosGraficoTreinos = [
      { label: 'Sem 1', value: 3, semana: 'Sem 1', treinos: 3 },
      { label: 'Sem 2', value: 4, semana: 'Sem 2', treinos: 4 },
      { label: 'Sem 3', value: 5, semana: 'Sem 3', treinos: 5 },
      { label: 'Sem 4', value: this.progressoSemanal.treinos, semana: 'Sem 4', treinos: this.progressoSemanal.treinos }
    ];

    // Dados de calorias por dia da semana
    this.dadosGraficoCaloriasSemana = [
      { label: 'Seg', value: 320, dia: 'Seg', calorias: 320 },
      { label: 'Ter', value: 280, dia: 'Ter', calorias: 280 },
      { label: 'Qua', value: 350, dia: 'Qua', calorias: 350 },
      { label: 'Qui', value: 300, dia: 'Qui', calorias: 300 },
      { label: 'Sex', value: 400, dia: 'Sex', calorias: 400 },
      { label: 'Sáb', value: 450, dia: 'Sáb', calorias: 450 },
      { label: 'Dom', value: 200, dia: 'Dom', calorias: 200 }
    ];
  }

  calcularEstatisticas() {
    // Calcular estatísticas baseadas nos dados disponíveis
    this.estatisticas = {
      totalTreinos: 47,
      totalCalorias: 12350,
      tempoTotal: 2340, // em minutos
      melhorSequencia: 12,
      sequenciaAtual: this.progressoSemanal.treinos
    };
  }

  carregarConquistas() {
    this.conquistasRecentes = [
      {
        id: '1',
        titulo: 'Primeira Semana Completa',
        descricao: 'Completou todos os treinos da semana',
        icone: 'trophy',
        data: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 dias atrás
      },
      {
        id: '2',
        titulo: 'Meta de Peso Atingida',
        descricao: 'Perdeu 2kg em relação ao peso inicial',
        icone: 'trending-down',
        data: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 dias atrás
      },
      {
        id: '3',
        titulo: 'Consistency Master',
        descricao: 'Treinou por 7 dias consecutivos',
        icone: 'flame',
        data: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias atrás
      }
    ];
  }

  onPeriodoChange() {
    this.gerarDadosGraficos();
    this.calcularEstatisticas();
  }

  exportarRelatorio() {
    // Implementar exportação de relatório
    console.log('Exportando relatório de progresso...');
    // TODO: Implementar funcionalidade de exportação
  }

  voltarParaHome() {
    this.navigationService.navigateTo('/home');
  }

  formatarTempo(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }

  getProgressoPercentual(atual: number, inicial: number, meta: number): number {
    const progresso = Math.abs(inicial - atual);
    const total = Math.abs(inicial - meta);
    return Math.min((progresso / total) * 100, 100);
  }

  getCorProgresso(percentual: number): string {
    if (percentual >= 80) return 'success';
    if (percentual >= 50) return 'warning';
    return 'danger';
  }

  // Novos métodos para a interface modernizada
  formatNumber(value: number): string {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k';
    }
    return value.toString();
  }

  getProgressClass(percentage: number): string {
    if (percentage >= 80) return 'progress-excellent';
    if (percentage >= 60) return 'progress-good';
    if (percentage >= 40) return 'progress-average';
    return 'progress-needs-work';
  }

  getDifference(current: number, initial: number): string {
    const diff = current - initial;
    return diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  }

  getPeriodLabel(): string {
    switch (this.periodoSelecionado) {
      case '7d': return 'Últimos 7 dias';
      case '30d': return 'Últimos 30 dias';
      case '90d': return 'Últimos 3 meses';
      case '365d': return 'Último ano';
      default: return 'Período selecionado';
    }
  }

  getWeightChartPoints(): string {
    return this.dadosGraficoPeso
      .map((ponto, index) => {
        const x = (index / (this.dadosGraficoPeso.length - 1)) * 360 + 20;
        const pesoValue = typeof ponto['peso'] === 'number' ? ponto['peso'] : ponto.value;
        const y = 180 - ((pesoValue - 65) / (80 - 65)) * 160;
        return `${x},${y}`;
      })
      .join(' ');
  }

  getEstimatedWeeks(): number {
    const currentWeight = this.progressoMensal.peso.atual;
    const targetWeight = this.progressoMensal.peso.meta;
    const initialWeight = this.progressoMensal.peso.inicial;
    
    const weeklyProgress = Math.abs(currentWeight - initialWeight) / 4; // Assuming 4 weeks of progress
    const remainingWeight = Math.abs(targetWeight - currentWeight);
    
    return Math.ceil(remainingWeight / weeklyProgress) || 4;
  }

  // Métodos auxiliares para converter valores unknown para number
  getPesoValue(ponto: ChartData): number {
    return typeof ponto['peso'] === 'number' ? ponto['peso'] : 0;
  }

  getTreinosValue(item: ChartData): number {
    return typeof item['treinos'] === 'number' ? item['treinos'] : 0;
  }

  getDataValue(item: ChartData): string {
    return typeof item['data'] === 'string' ? item['data'] : '';
  }

  getSemanaValue(item: ChartData): string {
    return typeof item['semana'] === 'string' ? item['semana'] : '';
  }
}
