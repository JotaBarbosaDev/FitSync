import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProgressDataService, Achievement } from '../../services/progress-data.service';

@Component({
  selector: 'app-achievements',
  templateUrl: './achievements.page.html',
  styleUrls: ['./achievements.page.scss'],
})
export class AchievementsPage implements OnInit, OnDestroy {
  achievements: Achievement[] = [];
  filteredAchievements: Achievement[] = [];
  selectedCategory: string = 'all';
  showUnlockedOnly: boolean = false;

  private subscriptions: Subscription[] = [];

  categories = [
    { id: 'all', name: 'Todas', icon: 'apps-outline' },
    { id: 'consistency', name: 'Consistência', icon: 'calendar-outline' },
    { id: 'strength', name: 'Força', icon: 'barbell-outline' },
    { id: 'volume', name: 'Volume', icon: 'trending-up-outline' },
    { id: 'milestone', name: 'Marcos', icon: 'trophy-outline' }
  ];

  constructor(
    private router: Router,
    private progressDataService: ProgressDataService
  ) { }

  ngOnInit() {
    this.subscribeToAchievements();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private subscribeToAchievements() {
    const achievementsSub = this.progressDataService.achievements$.subscribe(achievements => {
      this.achievements = achievements.sort((a, b) => {
        // Sort by unlocked status first, then by date
        if (a.isUnlocked !== b.isUnlocked) {
          return a.isUnlocked ? -1 : 1;
        }
        if (a.isUnlocked && b.isUnlocked) {
          return new Date(b.dateEarned).getTime() - new Date(a.dateEarned).getTime();
        }
        return a.title.localeCompare(b.title);
      });
      this.applyFilters();
    });
    this.subscriptions.push(achievementsSub);
  }

  onCategoryChange(category: string) {
    this.selectedCategory = category;
    this.applyFilters();
  }

  onFilterToggle() {
    this.showUnlockedOnly = !this.showUnlockedOnly;
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = [...this.achievements];

    // Filter by category
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(achievement => achievement.category === this.selectedCategory);
    }

    // Filter by unlocked status
    if (this.showUnlockedOnly) {
      filtered = filtered.filter(achievement => achievement.isUnlocked);
    }

    this.filteredAchievements = filtered;
  }

  goBack() {
    this.router.navigate(['/progress']);
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'consistency': return 'calendar';
      case 'strength': return 'barbell';
      case 'volume': return 'trending-up';
      case 'milestone': return 'trophy';
      default: return 'medal';
    }
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case 'consistency': return 'primary';
      case 'strength': return 'danger';
      case 'volume': return 'warning';
      case 'milestone': return 'success';
      default: return 'medium';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  getUnlockedCount(): number {
    return this.achievements.filter(a => a.isUnlocked).length;
  }

  getTotalCount(): number {
    return this.achievements.length;
  }

  getProgressPercentage(): number {
    if (this.achievements.length === 0) return 0;
    return Math.round((this.getUnlockedCount() / this.getTotalCount()) * 100);
  }
}
