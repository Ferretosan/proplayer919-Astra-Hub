
// Astragames SDK
class Astragames {
  constructor() {
    this.achievements = new Map();
    this.achievementsEarned = new Set(JSON.parse(localStorage.getItem('astra_achievements') || '[]'));
  }

  registerAchievement(id, name, description, icon = 'fa-trophy') {
    this.achievements.set(id, { name, description, icon });
  }

  earnAchievement(id) {
    if (this.achievements.has(id) && !this.achievementsEarned.has(id)) {
      this.achievementsEarned.add(id);
      localStorage.setItem('astra_achievements', JSON.stringify([...this.achievementsEarned]));

      // Show achievement notification
      const achievement = this.achievements.get(id);
      const notification = document.createElement('div');
      notification.className = 'achievement';
      notification.innerHTML = `
        <i class="fas ${achievement.icon}"></i>
        <div class="achievement-text">
          <div class="achievement-title">${achievement.name}</div>
          <div class="achievement-desc">${achievement.description}</div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.classList.add('show'), 100);
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }, 3000);

      return true;
    }
    return false;
  }

  hasAchievement(id) {
    return this.achievementsEarned.has(id);
  }

  getEarnedAchievements() {
    return Array.from(this.achievementsEarned).map(id => ({
      id,
      ...this.achievements.get(id)
    }));
  }
}

// Export
export default Astragames;