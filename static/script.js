document.addEventListener('DOMContentLoaded', () => {
    // Current state
    let tasks = [];
    let currentFilter = 'all';
    let currentDate = new Date(); // For calendar view
    const today = new Date();
    
    // Set today's date in add task input by default
    document.getElementById('task-date').valueAsDate = today;

    // Display formatted date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-display').innerText = today.toLocaleDateString('en-US', options);

    // Navigation
    const navToday = document.getElementById('nav-today');
    const navCalendar = document.getElementById('nav-calendar');
    const navUpcoming = document.getElementById('nav-upcoming');
    const viewToday = document.getElementById('task-view');
    const viewCalendar = document.getElementById('calendar-view');
    const viewUpcoming = document.getElementById('upcoming-view');
    const pageTitle = document.getElementById('page-title');

    function setActiveNav(nav, view, title) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        nav.classList.add('active');
        view.classList.add('active');
        pageTitle.innerText = title;
    }

    navToday.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveNav(navToday, viewToday, "Today's Tasks");
    });

    navCalendar.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveNav(navCalendar, viewCalendar, "Calendar View");
        renderCalendar();
    });

    navUpcoming.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveNav(navUpcoming, viewUpcoming, "Upcoming Tasks Log");
        renderUpcomingTasks();
    });

    // Fetch and render tasks
    async function fetchTasks() {
        try {
            const res = await fetch('/api/tasks');
            tasks = await res.json();
            renderTasks();
            renderUpcomingTasks();
            if (viewCalendar.classList.contains('active')) {
                renderCalendar();
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }

    // Add Task
    document.getElementById('add-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('task-input');
        const dateInput = document.getElementById('task-date');
        
        const newTask = {
            title: titleInput.value,
            date: dateInput.value,
            status: 'incomplete'
        };

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
            const createdTask = await res.json();
            tasks.push(createdTask);
            titleInput.value = '';
            renderTasks();
            renderUpcomingTasks();
            if (viewCalendar.classList.contains('active')) {
                renderCalendar();
            }
        } catch (error) {
            console.error('Error adding task:', error);
        }
    });

    // Render Tasks in List
    function renderTasks() {
        const list = document.getElementById('task-list');
        list.innerHTML = '';
        
        const todayStr = new Date().toISOString().split('T')[0];
        
        const filteredTasks = tasks.filter(task => {
            // Exclude future tasks
            if (task.date > todayStr) return false;
            
            if (currentFilter === 'all') return true;
            return task.status === currentFilter;
        });

        if (filteredTasks.length === 0) {
            list.innerHTML = `<div class="empty-state">No tasks found for today. Enjoy your day!</div>`;
            return;
        }

        const template = document.getElementById('task-template');

        // Sort by date (closest first)
        filteredTasks.sort((a, b) => new Date(a.date) - new Date(b.date));

        filteredTasks.forEach(task => {
            const clone = template.content.cloneNode(true);
            const taskItem = clone.querySelector('.task-item');
            
            taskItem.dataset.id = task.id;
            taskItem.dataset.status = task.status;
            
            if (task.status === 'completed') {
                taskItem.classList.add('completed');
            }

            clone.querySelector('.task-title').innerText = task.title;
            clone.querySelector('.task-date-badge').innerText = task.date;
            
            const statusSelect = clone.querySelector('.status-select');
            statusSelect.value = task.status;
            
            // Event listeners for this task
            statusSelect.addEventListener('change', (e) => updateTaskStatus(task.id, e.target.value));
            clone.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

            list.appendChild(clone);
        });
    }

    // Render Upcoming Tasks
    function renderUpcomingTasks() {
        const list = document.getElementById('upcoming-task-list');
        list.innerHTML = '';
        
        const todayStr = new Date().toISOString().split('T')[0];
        
        const futureTasks = tasks.filter(task => task.date > todayStr);
        
        if (futureTasks.length === 0) {
            list.innerHTML = `<div class="empty-state">No upcoming tasks found in the future.</div>`;
            return;
        }

        const template = document.getElementById('task-template');
        futureTasks.sort((a, b) => new Date(a.date) - new Date(b.date));

        futureTasks.forEach(task => {
            const clone = template.content.cloneNode(true);
            const taskItem = clone.querySelector('.task-item');
            
            taskItem.dataset.id = task.id;
            taskItem.dataset.status = task.status;
            
            if (task.status === 'completed') {
                taskItem.classList.add('completed');
            }

            clone.querySelector('.task-title').innerText = task.title;
            const displayDate = new Date(task.date);
            clone.querySelector('.task-date-badge').innerText = displayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            
            const statusSelect = clone.querySelector('.status-select');
            statusSelect.value = task.status;
            
            statusSelect.addEventListener('change', (e) => updateTaskStatus(task.id, e.target.value));
            clone.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

            list.appendChild(clone);
        });
    }

    // Update Task Status
    async function updateTaskStatus(id, newStatus) {
        try {
            await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            
            const taskIndex = tasks.findIndex(t => t.id === id);
            if (taskIndex !== -1) {
                tasks[taskIndex].status = newStatus;
                renderTasks();
                renderUpcomingTasks();
                if (viewCalendar.classList.contains('active')) {
                    renderCalendar();
                }
            }
        } catch (error) {
            console.error('Error updating task:', error);
        }
    }

    // Delete Task
    async function deleteTask(id) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        try {
            await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            tasks = tasks.filter(t => t.id !== id);
            renderTasks();
            renderUpcomingTasks();
            if (viewCalendar.classList.contains('active')) {
                renderCalendar();
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderTasks();
        });
    });

    // Calendar logic
    const monthDisplay = document.getElementById('month-display');
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        monthDisplay.innerText = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const firstDayIndex = new Date(year, month, 1).getDay();
        const lastDay = new Date(year, month + 1, 0).getDate();
        
        const grid = document.querySelector('.calendar-grid');
        // Keep weekdays
        const weekdays = Array.from(grid.querySelectorAll('.weekday'));
        grid.innerHTML = '';
        weekdays.forEach(wd => grid.appendChild(wd));
        
        // Empty cells for first row
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            grid.appendChild(emptyCell);
        }
        
        // Days
        for (let i = 1; i <= lastDay; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            
            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayCell.classList.add('today');
            }
            
            const dayNum = document.createElement('div');
            dayNum.className = 'day-number';
            dayNum.innerText = i;
            dayCell.appendChild(dayNum);
            
            // Add task indicators
            const dayTasks = tasks.filter(t => t.date === dateStr);
            if (dayTasks.length > 0) {
                const indicators = document.createElement('div');
                indicators.className = 'day-indicators';
                
                dayTasks.forEach(t => {
                    const dot = document.createElement('div');
                    dot.className = `task-dot ${t.status === 'partially complete' ? 'partial' : t.status}`;
                    dot.title = t.title;
                    indicators.appendChild(dot);
                });
                
                dayCell.appendChild(indicators);
            }
            
            // Allow clicking day to add task
            dayCell.style.cursor = 'pointer';
            dayCell.addEventListener('click', () => {
                const modal = document.getElementById('task-modal');
                const title = document.getElementById('modal-title');
                const dateInput = document.getElementById('modal-task-date');
                
                modal.classList.add('active');
                
                const displayDate = new Date(year, month, i);
                title.innerText = `Add Task for ${displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                dateInput.value = dateStr;
                
                document.getElementById('modal-task-input').focus();
            });
            
            grid.appendChild(dayCell);
        }
    }

    // Modal Events
    const modal = document.getElementById('task-modal');
    document.querySelector('.close-modal').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    document.getElementById('modal-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('modal-task-input');
        const dateInput = document.getElementById('modal-task-date');
        
        const newTask = {
            title: titleInput.value,
            date: dateInput.value,
            status: 'incomplete'
        };

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
            const createdTask = await res.json();
            tasks.push(createdTask);
            titleInput.value = '';
            modal.classList.remove('active');
            renderTasks();
            renderUpcomingTasks();
            if (viewCalendar.classList.contains('active')) {
                renderCalendar();
            }
        } catch (error) {
            console.error('Error adding task:', error);
        }
    });

    // Initial fetch
    fetchTasks();
});
