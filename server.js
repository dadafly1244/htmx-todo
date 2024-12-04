import express from 'express';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

let todos = [

];

const getItemsLeft = () => todos.filter(t => !t.done).length;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Todo item template
const todoItemTemplate = (todo) => `
  <li id="todo-${todo.id}" class="${todo.done ? 'completed' : ''}">
    <div class="view">
      <input 
        class="toggle" 
        type="checkbox"
        ${todo.done ? 'checked' : ''} 
        hx-patch="/todos/${todo.id}"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML">
      <label
        hx-get="/todos/edit/${todo.id}"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML"
        hx-trigger="dblclick">
        ${todo.name}
      </label>
      <button 
        class="destroy"
        hx-delete="/todos/${todo.id}"
        hx-target="#todo-${todo.id}"
        hx-swap="outerHTML">
      </button>
    </div>
  </li>
`;

// Edit form template
const editItemTemplate = (todo) => `
  <li id="todo-${todo.id}" class="editing">
    <form hx-post="/todos/update/${todo.id}"
          hx-target="#todo-${todo.id}"
          hx-swap="outerHTML">
      <input 
        class="edit"
        type="text"
        name="name"
        value="${todo.name}"
        autocomplete="off"
        autofocus
        hx-trigger="blur from:input">
    </form>
  </li>
`;

// Get filtered todos
const getFilteredTodos = (filter = 'all') => {
    switch(filter) {
        case 'active':
            return todos.filter(t => !t.done);
        case 'completed':
            return todos.filter(t => t.done);
        default:
            return todos;
    }
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/todos', (req, res) => {
    const { filter = 'all' } = req.query;
    const filteredTodos = getFilteredTodos(filter);
    const todosList = filteredTodos.map(todo => todoItemTemplate(todo)).join('');
    res.send(todosList);
});

app.post('/todos', (req, res) => {
    const { todo } = req.body;
    if (!todo?.trim()) {
        return res.status(400).send('할일의 내용을 입력해 주세요.');
    }
    
    const newTodo = {
        id: uuid(),
        name: todo,
        done: false
    };
    todos.unshift(newTodo);
    
    const todoHtml = todoItemTemplate(newTodo);
    res.header("HX-Trigger", "todosChanged");
    res.send(todoHtml);
});

app.get('/todos/edit/:id', (req, res) => {
    const { id } = req.params;
    const todo = todos.find(t => t.id === id);
    if (!todo) {
        return res.status(404).send('Todo not found');
    }
    res.send(editItemTemplate(todo));
});

app.patch('/todos/:id', (req, res) => {
    const { id } = req.params;
    const todo = todos.find(t => t.id === id);
    if (!todo) {
        return res.status(404).send('Todo not found');
    }
    todo.done = !todo.done;
    
    // 현재 필터 상태에서 이 todo가 보여져야 하는지 확인
    const filter = req.query.filter || 'all';
    if ((filter === 'active' && todo.done) || (filter === 'completed' && !todo.done)) {
        res.header("HX-Trigger", "todosChanged");
        return res.send(''); // todo를 제거
    }

    res.header("HX-Trigger", "todosChanged");
    res.send(todoItemTemplate(todo));
});

app.post('/todos/update/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name?.trim()) {
        return res.status(400).send('할일의 내용을 입력해 주세요.');
    }
    
    const todo = todos.find(t => t.id === id);
    if (!todo) {
        return res.status(404).send('Todo not found');
    }
    todo.name = name;
    
    res.send(todoItemTemplate(todo));
});

app.delete('/todos/:id', (req, res) => {
    const { id } = req.params;
    todos = todos.filter(t => t.id !== id);
    res.header("HX-Trigger", "todosChanged");
    res.send('');
});

app.post('/todos/clear-completed', (req, res) => {
    todos = todos.filter(t => !t.done);
    const remainingTodos = getFilteredTodos(req.query.filter || 'all');
    res.header("HX-Trigger", "todosChanged");
    res.send(remainingTodos.map(todo => todoItemTemplate(todo)).join(''));
});

// Update todo count
app.get('/todo-count', (req, res) => {
    const count = getItemsLeft();
    res.send(`할일이 <strong>${count}</strong>개 남았습니다.`);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});