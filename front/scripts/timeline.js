/**
 * Gestion du drag & drop pour la timeline de tournée
 */

class TimelineDragDrop {
    constructor() {
        this.draggedElement = null;
        this.placeholder = null;
        this.init();
    }

    init() {
        this.setupDraggableSteps();
    }

    /**
     * Réinitialise le drag & drop (à appeler après modification de la timeline)
     */
    refresh() {
        this.setupDraggableSteps();
    }

    setupDraggableSteps() {
        const timelineScroll = document.querySelector('.timeline-scroll');
        if (!timelineScroll) return;

        const steps = timelineScroll.querySelectorAll('.step');

        steps.forEach((step) => {
            // Ne pas rendre draggable le premier (départ) et le dernier (arrivée)
            const isDraggable = step.querySelector('.drag-handle');

            if (isDraggable) {
                step.setAttribute('draggable', 'true');
                this.addDragListeners(step);
            }
        });

        // Listener sur le conteneur pour le drop
        timelineScroll.addEventListener('dragover', this.handleDragOver.bind(this));
        timelineScroll.addEventListener('drop', this.handleDrop.bind(this));
    }

    addDragListeners(step) {
        step.addEventListener('dragstart', this.handleDragStart.bind(this));
        step.addEventListener('dragend', this.handleDragEnd.bind(this));
        step.addEventListener('dragenter', this.handleDragEnter.bind(this));
    }

    handleDragStart(e) {
        this.draggedElement = e.currentTarget;
        e.currentTarget.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);

        // Créer un placeholder visuel
        this.createPlaceholder();
    }

    handleDragEnd(e) {
        e.currentTarget.style.opacity = '1';

        // Nettoyer les classes de survol
        const steps = document.querySelectorAll('.step');
        steps.forEach(step => {
            step.classList.remove('drag-over');
        });

        // Retirer le placeholder
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.parentNode.removeChild(this.placeholder);
        }

        this.draggedElement = null;
    }

    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDragEnter(e) {
        const targetStep = e.currentTarget;

        // Ne pas permettre de déplacer vers départ/arrivée
        if (!targetStep.querySelector('.drag-handle')) {
            return;
        }

        if (targetStep !== this.draggedElement) {
            // Déterminer si on insert avant ou après
            const rect = targetStep.getBoundingClientRect();
            const middleX = rect.left + rect.width / 2;

            if (e.clientX < middleX) {
                // Insérer avant
                targetStep.parentNode.insertBefore(this.draggedElement, targetStep);
            } else {
                // Insérer après
                targetStep.parentNode.insertBefore(this.draggedElement, targetStep.nextSibling);
            }
        }
    }

    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        // Recalculer les temps (optionnel - pour l'instant on garde les temps)
        this.updateTimeline();

        return false;
    }

    createPlaceholder() {
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'step-placeholder';
        this.placeholder.style.cssText = `
            display: inline-flex;
            width: 80px;
            height: 60px;
            border: 2px dashed #bdc3c7;
            border-radius: 8px;
            margin-right: 25px;
            background: rgba(189, 195, 199, 0.1);
        `;
    }

    updateTimeline() {
        // Cette méthode peut être utilisée pour recalculer les temps
        // ou mettre à jour l'état de l'application
        console.log('Timeline réorganisée');

        // Émettre un événement personnalisé pour notifier l'application
        const event = new CustomEvent('timeline-reordered', {
            detail: {
                steps: this.getStepsOrder()
            }
        });
        document.dispatchEvent(event);
    }

    getStepsOrder() {
        const steps = document.querySelectorAll('.step');
        return Array.from(steps).map((step, index) => {
            return {
                index: index,
                time: step.querySelector('.step-time')?.textContent || '',
                desc: step.querySelector('.step-desc')?.textContent || '',
                icon: step.querySelector('.step-icon')?.textContent || ''
            };
        });
    }

}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Rendre l'instance disponible globalement si nécessaire
    window.timelineDragDrop = new TimelineDragDrop();

    // Écouter les changements de timeline
    document.addEventListener('timeline-reordered', (e) => {
        console.log('Nouvel ordre:', e.detail.steps);
        // Ici vous pouvez ajouter la logique pour sauvegarder l'ordre
    });
});

