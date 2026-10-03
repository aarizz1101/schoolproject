from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__name__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'tasks.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='incomplete') # 'completed', 'incomplete', 'partially complete'
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'status': self.status,
            'date': self.date.strftime('%Y-%m-%d')
        }

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    month = request.args.get('month', type=int)
    year = request.args.get('year', type=int)
    
    query = Task.query
    if month and year:
        # Simplistic filtering for SQLite (extracting month/year can be tricky in pure sqlite, so we fetch all and filter in python for this small app)
        tasks = Task.query.all()
        filtered_tasks = [t.to_dict() for t in tasks if t.date.month == month and t.date.year == year]
        return jsonify(filtered_tasks)
        
    tasks = Task.query.all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.json
    try:
        task_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except:
        task_date = datetime.utcnow().date()
        
    new_task = Task(
        title=data['title'],
        status=data.get('status', 'incomplete'),
        date=task_date
    )
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201

@app.route('/api/tasks/<int:id>', methods=['PUT'])
def update_task(id):
    task = Task.query.get_or_404(id)
    data = request.json
    if 'status' in data:
        task.status = data['status']
    if 'title' in data:
        task.title = data['title']
    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/api/tasks/<int:id>', methods=['DELETE'])
def delete_task(id):
    task = Task.query.get_or_404(id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'})

if __name__ == '__main__':
    import webview
    # Create the webview window
    webview.create_window('TaskMaster - Your Everyday Task Manager', app, width=1200, height=800)
    # Start the webview (this also starts the Flask app)
    webview.start()
