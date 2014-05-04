<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Ember.js TodoMVC</title>
    <link rel="stylesheet" href="/resources/style.css">
</head>
<body>
<script type="text/x-handlebars" data-template-name="todos/index">
    <ul id="todo-list">
        {{#each itemController="todo"}}
        <li {{bind-attr class="isCompleted:completed isEditing:editing"}}>
        {{#if isEditing}}
        {{edit-todo class="edit" value=title focus-out="acceptChanges" insert-newline="acceptChanges"}}
        {{else}}
        {{input type="checkbox" checked=isCompleted class="toggle"}}
        <label {{action "editTodo" on="doubleClick"}}>{{title}}</label><button {{action "removeTodo"}} class="destroy"></button>
        {{/if}}
        </li>
        {{/each}}
    </ul>
</script>


<script type="text/x-handlebars" data-template-name="todos">

    <section id="todoapp">
        <header id="header">
            <h1>todos</h1>
            {{input type="text" id="new-todo" placeholder="What needs to be done?"
            value=newTitle action="createTodo"}}
        </header>


        <section id="main">
            {{outlet}}
            {{input type="checkbox" id="toggle-all" checked=allAreDone}}
        </section>

        <footer id="footer">
          <span id="todo-count">
            <strong>{{remaining}}</strong> {{inflection}} left
          </span>
            <ul id="filters">
                <li>
                    {{#link-to "todos.index" activeClass="selected"}}All{{/link-to}}
                </li>
                <li>
                    {{#link-to "todos.active" activeClass="selected"}}Active{{/link-to}}
                </li>
                <li>
                    {{#link-to "todos.completed" activeClass="selected"}}Completed{{/link-to}}
                </li>
            </ul>

            {{#if hasCompleted}}
            <button id="clear-completed" {{action "clearCompleted"}}>
            Clear completed ({{completed}})
            </button>
            {{/if}}
        </footer>
    </section>

    <footer id="info">
        <p>Double-click to edit a todo</p>
    </footer>

</script>
<!--
<section id="todoapp">
    <header id="header">
        <h1>todos</h1>
        <input type="text" id="new-todo" placeholder="What needs to be done?" />
    </header>

    <section id="main">
        <ul id="todo-list">
            <li class="completed">
                <input type="checkbox" class="toggle">
                <label>Learn Ember.js</label><button class="destroy"></button>
            </li>
            <li>
                <input type="checkbox" class="toggle">
                <label>...</label><button class="destroy"></button>
            </li>
            <li>
                <input type="checkbox" class="toggle">
                <label>Profit!</label><button class="destroy"></button>
            </li>
        </ul>

        <input type="checkbox" id="toggle-all">
    </section>

    <footer id="footer">
        <span id="todo-count">
          <strong>2</strong> todos left
        </span>
        <ul id="filters">
            <li>
                <a href="all" class="selected">All</a>
            </li>
            <li>
                <a href="active">Active</a>
            </li>
            <li>
                <a href="completed">Completed</a>
            </li>
        </ul>

        <button id="clear-completed">
            Clear completed (1)
        </button>
    </footer>
</section>

<footer id="info">
    <p>Double-click to edit a todo</p>
</footer>
-->

<!--
<script src="js/libs/jquery-1.10.2.js"></script>
<script src="js/libs/handlebars-1.1.2.js"></script>
<script src="js/libs/ember-1.5.0.js"></script>
<script src="js/libs/ember-states.js"></script>
<script src="js/libs/ember-data-0.13.js"></script>
-->
<script src="js/libs/jquery-1.10.2.js"></script>
<script src="js/libs/handlebars-1.0.0.js"></script>
<script src="js/libs/ember.js"></script>
<script src="js/libs/ember-data.js"></script>
<script src="js/application.js"></script>
<script src="js/router.js"></script>
<script src="js/models/todo.js"></script>
<script src="js/controllers/todos_controller.js"></script>
<script src="js/controllers/todo_controller.js"></script>
<script src="js/views/edit_todo_view.js"></script>

</body>
</html>
