import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area';
  color: string;
  showPoints?: boolean;
  showGrid?: boolean;
  height?: number;
}

@Component({
  selector: 'app-progress-chart',
  templateUrl: './progress-chart.component.html',
  styleUrls: ['./progress-chart.component.scss'],
  standalone: false,
})
export class ProgressChartComponent implements OnInit, OnChanges {
  @Input() data: ChartDataPoint[] = [];
  @Input() config: ChartConfig = {
    type: 'line',
    color: '#3880ff',
    showPoints: true,
    showGrid: true,
    height: 200
  };
  @Input() title?: string;

  public chartPath: string = '';
  public viewBox: string = '0 0 300 200';
  public maxValue: number = 0;
  public minValue: number = 0;
  public xLabels: string[] = [];
  public yLabels: string[] = [];

  constructor() { }

  ngOnInit() {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] || changes['config']) {
      this.updateChart();
    }
  }

  private updateChart(): void {
    if (!this.data || this.data.length === 0) {
      this.chartPath = '';
      return;
    }

    this.calculateBounds();
    this.generateLabels();
    this.generatePath();
  }

  private calculateBounds(): void {
    const values = this.data.map(d => d.value);
    this.maxValue = Math.max(...values);
    this.minValue = Math.min(...values);
    
    // Add padding
    const padding = (this.maxValue - this.minValue) * 0.1;
    this.maxValue += padding;
    this.minValue = Math.max(0, this.minValue - padding);
  }

  private generateLabels(): void {
    // X labels (dates)
    this.xLabels = this.data.map(d => {
      const date = new Date(d.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    // Y labels (values)
    const steps = 5;
    this.yLabels = [];
    for (let i = 0; i <= steps; i++) {
      const value = this.minValue + (this.maxValue - this.minValue) * (i / steps);
      this.yLabels.push(value.toFixed(1));
    }
  }

  private generatePath(): void {
    if (this.data.length < 2) {
      this.chartPath = '';
      return;
    }

    const points = this.data.map((d, i) => {
      const x = (i / (this.data.length - 1)) * 280 + 10; // 10px padding
      const y = 190 - ((d.value - this.minValue) / (this.maxValue - this.minValue)) * 180; // 190 - 10px padding
      return { x, y };
    });

    if (this.config.type === 'line' || this.config.type === 'area') {
      let path = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        // Smooth curves using quadratic bezier
        const cp1x = (points[i-1].x + points[i].x) / 2;
        const cp1y = points[i-1].y;
        const cp2x = (points[i-1].x + points[i].x) / 2;
        const cp2y = points[i].y;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`;
      }

      if (this.config.type === 'area') {
        path += ` L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`;
      }

      this.chartPath = path;
    }
  }

  public getPointPosition(index: number): { x: number, y: number } {
    if (!this.data[index]) return { x: 0, y: 0 };
    
    const x = (index / (this.data.length - 1)) * 280 + 10;
    const y = 190 - ((this.data[index].value - this.minValue) / (this.maxValue - this.minValue)) * 180;
    
    return { x, y };
  }

  public formatValue(value: number): string {
    return value.toFixed(1);
  }
}
