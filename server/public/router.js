// Redux==========================================
const createStore = (reducer, initialState) => {
  let state = initialState;
  const arrFoo = [];

  return {
    getState: () => state,
    dispatch: (action) => {
      state = reducer(state, action);
      arrFoo.forEach((f) => f());
    },
    subscribe: (cb) => typeof cb === "function" && arrFoo.push(cb),
  };
};

const combineReducers = (reducersMap) => (state, action) => {
  const nextState = {};
  Object.entries(reducersMap).forEach(([key, reducer]) => {
    nextState[key] = reducer(state[key], action);
  });
  return nextState;
};

const todosReducer = (state = [], { type, payload }) => {
  switch (type) {
    case "FETCH_TODOS":
      return payload;
    case "ADD":
      return [...state, payload];
    case "DELETE":
      return state.filter((todo) => todo._id !== payload._id);
    case "UPDATE":
      const idx = state.findIndex((todo) => todo._id === payload._id);
      const newState = [...state];
      newState[idx];
      newState[idx].todo = payload.todo;
      return newState;
    case "SELECT":
      const index = state.findIndex((todo) => todo._id === payload._id);
      const nextState = [...state];
      nextState[index].completed = payload.completed;
      return nextState;
    case "SELECT_ALL":
      return state.reduce((acc, todo) => {
        todo.completed = true;
        acc.push(todo);
        return acc;
      }, []);
    case "UNSELECT_ALL":
      return state.reduce((acc, todo) => {
        todo.completed = false;
        acc.push(todo);
        return acc;
      }, []);
    case "CLEAR_COMPLETED":
      return state.filter((todo) => !todo.completed);
    default:
      return state;
  }
};

const filtrationReducer = (state = "all", { type, payload }) => {
  switch (type) {
    case "GET_FILTRATION":
      const filtrationState = localStorage.getItem("filtrationState");
      if (filtrationState) {
        localStorage.setItem("filtrationState", filtrationState);
        return filtrationState;
      }
      localStorage.setItem("filtrationState", state);
      return state;
    case "ALL":
      localStorage.setItem("filtrationState", payload);
      return payload;
    case "ACTIVE":
      localStorage.setItem("filtrationState", payload);
      return payload;
    case "COMPLETED":
      localStorage.setItem("filtrationState", payload);
      return payload;
    default:
      return state;
  }
};

const usersReducer = (state = {}, { type, payload }) => {
  switch (type) {
    case "CREATE_USER":
      return payload;
    case "LOGIN_USER":
      localStorage.setItem("userId", payload._id);
      return payload;
    case "CURRENT_USER":
      return payload;
    case "LOGOUT_USER":
      localStorage.removeItem("userId");
      return {};
    default:
      return state;
  }
};

const reducer = combineReducers({
  todos: todosReducer,
  filtration: filtrationReducer,
  user: usersReducer,
});
const store = createStore(reducer, {});

// Redux=================================================

const callApi = (path, options) => {
  options?.body && (options.body = JSON.stringify(options.body));

  const url = "http://localhost:8050";
  const defaultOptions = {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "GET",
  };
  return fetch(`${url}${path}`, { ...defaultOptions, ...options })
    .then((r) => r.json())
    .then((d) => {
      if (d.code < 200 || d.code > 399) {
        return Promise.reject(d);
      }
      return d;
    });
};

const eventNames = {
  submit: "submit",
  selectAll: "selectAll",
  clearCompleted: "clearCompleted",
  btnSelectAll: "btnSelectAll",
  btnSelectActive: "btnSelectActive",
  btnSelectCompleted: "btnSelectCompleted",
  btnDelete: "btnDelete",
  select: "select",
  showUpdateInput: "showUpdateInput",
  blur: "blur",
  keyDown: "keyDown",
  btnRedirectInForm: "btnRedirectInForm",
  submitRegistration: "submitRegistration",
  submitAuthorization: "submitAuthorization",
  btnLogout: "btnLogout",
  copyText: "copyText",
};

const routes = {
  logup: "/logup",
  login: "/login",
  todos: "/todos",
};

class EventEmitter {
  events = {};

  on(eventName, callback) {
    !this.events[eventName] && (this.events[eventName] = []);
    this.events[eventName].push(callback);
  }

  off(eventName, callback) {
    this.events[eventName] = this.events[eventName].filter(
      (eventCallback) => callback !== eventCallback
    );
  }

  emit(eventName, args) {
    const event = this.events[eventName];
    event && event.forEach((callback) => callback.call(null, args));
  }
}

class App {
  elements = null;
  store = null;
  registrationPage = null;
  loginPage = null;

  constructor(rootRef) {
    this.rootElement = rootRef;

    const elemenstInit = new Elements({
      onSubmit: this.onSubmit,
      onSelectAll: this.onSelectAll,
      onClearCompleted: this.onClearCompleted,
      onButtonSelectAll: this.onButtonSelectAll,
      onButtonSelectActive: this.onButtonSelectActive,
      onButtonSelectCompleted: this.onButtonSelectCompleted,
      onBtnLogout: this.onBtnLogout,
    });

    this.elements = {
      container: elemenstInit.createContainer("container"),
      title: elemenstInit.createTitle(),
      form: elemenstInit.createForm(),
      todoContainer: elemenstInit.createContainer("todoContainer"),
      counterUnfulfilledTodo: elemenstInit.createCounterUnfulfilledTodo(),
      btnClear: elemenstInit.createBtnClear(),
      sortButtonList: elemenstInit.createSortButtonList(),
      footer: elemenstInit.createFooter(),
      errorNotice: elemenstInit.createErrorNotice(
        "Oops..! Something went wrong"
      ),
      succesNotice: elemenstInit.createSuccesNotice("Succes"),
      logout: elemenstInit.createBtnLogout(),
      helloTitle: elemenstInit.createHelloTitle(),
    };

    this.registrationPage = new RegistrationPage(rootRef, {
      onRedirect: this.onRedirect,
      onRegistration: this.onRegistration,
    });
    this.loginPage = new LoginPage(rootRef, {
      onRedirect: this.onRedirect,
      onAuthorization: this.onAuthorization,
    });

    window.addEventListener("load", () => this.refreshUser());
    window.addEventListener("popstate", () => this.routing());
  }

  start() {
    store.subscribe(() => {
      this.store = store.getState();
      console.log("state", this.store);
    });
  }

  go() {
    this.createMainMarcup();
    store.dispatch({ type: "GET_FILTRATION" });
    this.fetchTodos();
  }

  refreshUser() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      store.dispatch({
        type: "CURRENT_USER",
        payload: { user: { isVerified: false } },
      });
      this.routing();
      return;
    }
    callApi("/users/current", {
      method: "POST",
      body: { _id: userId },
    })
      .then((data) => {
        store.dispatch({
          type: "CURRENT_USER",
          payload: data.user,
        });
        data.user.isVerified && history.pushState(null, null, routes.todos);
        this.routing();
      })
      .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));
  }

  fetchTodos() {
    callApi(`/todos?userId=${this.store.user._id}`)
      .then((data) => {
        store.dispatch({ type: "FETCH_TODOS", payload: data.todos });
        this.render();
      })
      .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));
  }

  onSubmit = (e) => {
    e.preventDefault();
    const todo = e.currentTarget.elements.input.value.trim();
    if (todo === "") return;

    callApi("/todos", {
      method: "POST",
      body: { todo: todo, owner: this.store.user._id },
    })
      .then((data) => {
        store.dispatch({ type: "ADD", payload: data.todo });
        this.render();
      })
      .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));

    e.currentTarget.reset();
  };

  onDelete = (e) => {
    this.deleteTodo(e);
  };

  onSelect = (e) => {
    const checkboxIndex = e.target.dataset.index;
    const isChecked = e.target.checked;

    callApi(`/todos?todoId=${checkboxIndex}`, {
      method: "PATCH",
      body: { select: isChecked, owner: this.store.user._id },
    })
      .then((data) => {
        store.dispatch({ type: "SELECT", payload: data.todo });
        this.render();
      })
      .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));
  };

  onSelectAll = () => {
    const isAllCompleted = this.store.todos.every(({ completed }) => completed);
    if (isAllCompleted) {
      callApi("/todos/unselect.all", {
        method: "POST",
        body: { owner: this.store.user._id },
      })
        .then(() => {
          store.dispatch({ type: "UNSELECT_ALL" });
          this.render();
        })
        .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));

      return;
    }
    callApi("/todos/select.all", {
      method: "POST",
      body: { owner: this.store.user._id },
    })
      .then(() => {
        store.dispatch({ type: "SELECT_ALL" });
        this.render();
      })
      .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));
  };

  onButtonSelectAll = () => {
    store.dispatch({ type: "ALL", payload: "all" });
    this.render();
  };

  onButtonSelectActive = () => {
    store.dispatch({ type: "ACTIVE", payload: "active" });
    this.render();
  };

  onButtonSelectCompleted = () => {
    store.dispatch({ type: "COMPLETED", payload: "completed" });
    this.render();
  };

  onClearCompleted = () => {
    callApi("/todos/clear.completed", {
      method: "POST",
      body: { owner: this.store.user._id },
    })
      .then(() => {
        store.dispatch({ type: "CLEAR_COMPLETED" });
        this.render();
      })
      .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));
  };

  onShowUpdateInput = (e) => {
    this.showCheckboxSelect(e.target.dataset.index);
    e.target.classList.remove("isHidden");
  };

  onBlur = (e) => {
    this.updateTodo(e);
  };

  onKeyDown = (e) => {
    if (e.code === "Enter") {
      this.updateTodo(e);
    }
  };

  onRegistration = (e) => {
    e.preventDefault();
    const credentials = {
      name: e.currentTarget.elements.login.value.trim(),
      password: e.currentTarget.elements.password.value,
    };

    callApi("/users/signup", {
      method: "POST",
      body: credentials,
    })
      .then(({ user }) => {
        store.dispatch({ type: "CREATE_USER", payload: user });
        history.pushState(null, null, routes.login);
        this.routing();
      })
      .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));

    e.currentTarget.reset();
  };

  onAuthorization = (e) => {
    e.preventDefault();
    const credentials = {
      name: e.currentTarget.elements.login.value.trim(),
      password: e.currentTarget.elements.password.value,
    };

    callApi("/users/login", {
      method: "POST",
      body: credentials,
    })
      .then(({ user }) => {
        store.dispatch({ type: "LOGIN_USER", payload: user });
        history.pushState(null, null, routes.todos);
        this.routing();
      })
      .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));

    e.currentTarget.reset();
  };

  onRedirect = (e) => {
    const route = e.target.dataset.route;
    history.pushState(null, null, route);
    this.routing();
  };

  onBtnLogout = () => {
    callApi("/users/logout", {
      method: "POST",
      body: {
        _id: this.store.user._id,
      },
    })
      .then(() => {
        store.dispatch({ type: "LOGOUT_USER" });
        history.pushState(null, null, routes.login);
        this.routing();
      })
      .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));
  };

  onCopyText = (e) => {
    const elem = this.elements.todoContainer.querySelector(
      `li[data-index='${e.target.dataset.index}']`
    );

    navigator.clipboard
      .writeText(elem.textContent)
      .then(() => this.showSuccessNotice("Copied"));
  };

  deleteTodo(e) {
    const liIndex = e.target.dataset.index;
    callApi(`/todos?todoId=${liIndex}`, {
      method: "DELETE",
      body: { owner: this.store.user._id },
    })
      .then((data) => {
        store.dispatch({ type: "DELETE", payload: data.todo });
        this.render();
      })
      .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));
  }

  updateTodo(e) {
    const index = e.target.dataset.index;
    const newTodo = e.target.value.trim();
    if (newTodo === "") {
      this.deleteTodo(e);
      e.target.classList.add("isHidden");
      return;
    }

    callApi(`/todos?todoId=${index}`, {
      method: "PATCH",
      body: { updatedTodo: newTodo, owner: this.store.user._id },
    })
      .then((data) => {
        store.dispatch({ type: "UPDATE", payload: data.todo });
        this.render();
      })
      .catch((err) => this.showErrorNotice(`Oops... ${err.message}!`));

    e.target.classList.add("isHidden");
  }

  changeCounter() {
    const activeElements = this.store.todos.filter(
      ({ completed }) => !completed
    ).length;
    const isMoreThanOneActiveElements =
      this.store.todos.filter(({ completed }) => !completed).length > 1;

    this.elements.counterUnfulfilledTodo.textContent = `${activeElements} item${
      isMoreThanOneActiveElements ? "s" : ""
    } left`;
  }

  changeStyleBtnSelectAll() {
    const btnSelectAll = this.elements.form.querySelector(".btnSelectAll");
    const isAllCompleted = this.store.todos.every(({ completed }) => completed);
    if (isAllCompleted) {
      btnSelectAll.classList.add("isSelect");
      return;
    }
    btnSelectAll.classList.remove("isSelect");
  }

  showBtnClear() {
    const { btnClear } = this.elements;
    const hasCompletedTodo = this.store.todos.some((todo) => todo.completed);
    if (hasCompletedTodo) {
      btnClear.classList.remove("isHidden");
    } else {
      btnClear.classList.add("isHidden");
    }
  }

  showActiveBtnOnSort() {
    const { sortButtonList } = this.elements;
    const buttonAll = sortButtonList.querySelector("#buttonAll");
    const butttonActive = sortButtonList.querySelector("#butttonActive");
    const buttonCompleted = sortButtonList.querySelector("#buttonCompleted");

    switch (this.store.filtration) {
      case "all":
        buttonAll.classList.add("activeSortButton");
        butttonActive.classList.remove("activeSortButton");
        buttonCompleted.classList.remove("activeSortButton");
        break;

      case "active":
        buttonAll.classList.remove("activeSortButton");
        butttonActive.classList.add("activeSortButton");
        buttonCompleted.classList.remove("activeSortButton");
        break;

      case "completed":
        buttonAll.classList.remove("activeSortButton");
        butttonActive.classList.remove("activeSortButton");
        buttonCompleted.classList.add("activeSortButton");
        break;

      default:
        buttonAll.classList.add("activeSortButton");
        butttonActive.classList.remove("activeSortButton");
        buttonCompleted.classList.remove("activeSortButton");
        break;
    }
  }

  showCheckboxSelect(index) {
    this.elements.todoContainer
      .querySelector(`.fieldStatus[data-index='${index}']`)
      .classList.add("isHidden");
  }

  showErrorNotice(text) {
    const errorNotice = document.querySelector(".error");
    errorNotice.classList.remove("hidden");
    text ? (errorNotice.textContent = text) : errorNotice.textContent;
    setTimeout(() => errorNotice.classList.add("hidden"), 5000);
  }

  showSuccessNotice(text) {
    const succesNotice = document.querySelector(".succes");
    succesNotice.classList.remove("hidden");
    text ? (succesNotice.textContent = text) : succesNotice.textContent;
    setTimeout(() => succesNotice.classList.add("hidden"), 5000);
  }

  showFooterAndBtnSelectAll() {
    const { form, footer } = this.elements;
    const btnSelectAll = form.querySelector(".btnSelectAll");
    if (this.store.todos.length === 0) {
      footer.classList.add("visible");
      btnSelectAll.classList.add("visible");
      return;
    }
    footer.classList.remove("visible");
    btnSelectAll.classList.remove("visible");
  }

  createMainMarcup() {
    const {
      container,
      title,
      form,
      todoContainer,
      counterUnfulfilledTodo,
      btnClear,
      sortButtonList,
      footer,
      errorNotice,
      succesNotice,
      logout,
      helloTitle,
    } = this.elements;

    footer.appendChild(counterUnfulfilledTodo);
    footer.appendChild(sortButtonList);
    footer.appendChild(btnClear);

    form.insertAdjacentElement("beforeend", todoContainer);
    form.appendChild(footer);

    helloTitle.textContent = `Hello ${this.store.user.name}`;
    container.appendChild(title);
    container.appendChild(helloTitle);
    container.appendChild(logout);
    container.appendChild(form);
    container.appendChild(errorNotice);
    container.appendChild(succesNotice);

    this.rootElement.appendChild(container);
  }

  render() {
    const todosList = new Todos(
      {
        onDelete: this.onDelete,
        onSelect: this.onSelect,
        onShowUpdateInput: this.onShowUpdateInput,
        onBlur: this.onBlur,
        onKeyDown: this.onKeyDown,
        onCopyText: this.onCopyText,
      },
      this.store.todos
    ).getTodoList();

    const { todoContainer } = this.elements;
    todoContainer.innerHTML = "";
    todoContainer.insertAdjacentElement("beforeend", todosList);
    this.changeStyleBtnSelectAll();
    this.changeCounter();
    this.showBtnClear();
    this.showActiveBtnOnSort();
    this.showFooterAndBtnSelectAll();
  }

  routing() {
    const location = window.location.pathname;
    switch (true) {
      case location === routes.todos && this.store.user.isVerified:
        this.rootElement.innerHTML = "";
        this.go();
        break;
      case location === routes.logup && !this.store.user.isVerified:
        this.rootElement.innerHTML = "";
        this.registrationPage.go();
        break;
      case location === routes.login && !this.store.user.isVerified:
        this.rootElement.innerHTML = "";
        this.loginPage.go();
        break;

      default:
        history.pushState(null, null, routes.login);
        this.routing();
        break;
    }
  }
}

class Todos extends EventEmitter {
  constructor(handlers, todos) {
    super();
    this.onDelete = handlers.onDelete;
    this.onSelect = handlers.onSelect;
    this.onShowUpdateInput = handlers.onShowUpdateInput;
    this.onBlur = handlers.onBlur;
    this.onKeyDown = handlers.onKeyDown;
    this.onCopyText = handlers.onCopyText;
    this.todos = todos;

    this.createSubscribes();
  }

  createSubscribes() {
    this.on(eventNames.btnDelete, this.onDelete);
    this.on(eventNames.select, this.onSelect);
    this.on(eventNames.showUpdateInput, this.onShowUpdateInput);
    this.on(eventNames.blur, this.onBlur);
    this.on(eventNames.keyDown, this.onKeyDown);
    this.on(eventNames.copyText, this.onCopyText);
  }

  createTodoList() {
    const ul = document.createElement("ul");
    ul.classList.add("todos");
    return ul;
  }

  createTodoItem({ id, todo, completed }) {
    const li = document.createElement("li");
    li.classList.add("todoItem");
    completed && li.classList.add("unactive");
    li.textContent = todo;
    li.dataset.index = id;

    const button = document.createElement("button");
    button.classList.add("btnDel");
    button.dataset.index = id;
    button.setAttribute("title", "Delete");
    button.addEventListener("click", (e) => this.emit(eventNames.btnDelete, e));

    const btnCopyText = document.createElement("button");
    btnCopyText.classList.add("btnCopyText");
    btnCopyText.dataset.index = id;
    btnCopyText.setAttribute("title", "Copy to clipboard");
    btnCopyText.addEventListener("click", (e) =>
      this.emit(eventNames.copyText, e)
    );

    const label = document.createElement("label");
    label.classList.add("fieldStatus");
    label.dataset.index = id;

    const checkbox = document.createElement("input");
    checkbox.classList.add("checkbox");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("name", "status");
    checkbox.dataset.index = id;
    completed && checkbox.setAttribute("checked", true);
    checkbox.addEventListener("click", (e) => this.emit(eventNames.select, e));

    const spanForCheckbox = document.createElement("span");
    spanForCheckbox.classList.add("checkboxIcon");

    label.appendChild(checkbox);
    label.appendChild(spanForCheckbox);

    const input = document.createElement("input");
    input.classList.add("updateTodoInput");
    input.classList.add("isHidden");
    input.value = todo;
    input.dataset.index = id;
    input.setAttribute("type", "text");
    input.addEventListener("dblclick", (e) =>
      this.emit(eventNames.showUpdateInput, e)
    );
    input.addEventListener("blur", (e) => this.emit(eventNames.blur, e));
    input.addEventListener("keydown", (e) => this.emit(eventNames.keyDown, e));

    li.prepend(label);
    li.appendChild(input);
    li.appendChild(button);
    li.appendChild(btnCopyText);

    return li;
  }

  getTodos() {
    const filtrationState = localStorage.getItem("filtrationState") || "all";

    switch (filtrationState) {
      case "all":
        return this.todos;

      case "active":
        const todosActive = this.todos.filter(({ completed }) => !completed);
        return todosActive;

      case "completed":
        const todosCompleted = this.todos.filter(({ completed }) => completed);
        return todosCompleted;

      default:
        return this.todos;
    }
  }

  getTodoList() {
    const todos = this.getTodos();
    const arrElements = todos.map(({ _id: id, todo, completed }) =>
      this.createTodoItem({ id, todo, completed })
    );
    const ul = this.createTodoList();
    ul.append(...arrElements);
    return ul;
  }
}

class Elements extends EventEmitter {
  constructor({
    onSubmit,
    onSelectAll,
    onClearCompleted,
    onButtonSelectAll,
    onButtonSelectActive,
    onButtonSelectCompleted,
    onBtnLogout,
  }) {
    super();

    this.onSubmit = onSubmit;
    this.onSelectAll = onSelectAll;
    this.onClearCompleted = onClearCompleted;
    this.onAll = onButtonSelectAll;
    this.onActive = onButtonSelectActive;
    this.onCompleted = onButtonSelectCompleted;
    this.onBtnLogout = onBtnLogout;

    this.createSubscribes();
  }

  createSubscribes() {
    this.on(eventNames.submit, this.onSubmit);
    this.on(eventNames.selectAll, this.onSelectAll);
    this.on(eventNames.clearCompleted, this.onClearCompleted);
    this.on(eventNames.btnSelectAll, this.onAll);
    this.on(eventNames.btnSelectActive, this.onActive);
    this.on(eventNames.btnSelectCompleted, this.onCompleted);
    this.on(eventNames.btnLogout, this.onBtnLogout);
  }

  createContainer(className) {
    const container = document.createElement("div");
    container.classList.add(className);
    return container;
  }

  createFooter() {
    const footer = document.createElement("footer");
    footer.classList.add("footer");
    return footer;
  }

  createTitle() {
    const h1 = document.createElement("h1");
    h1.textContent = "todos";
    h1.classList.add("title");
    return h1;
  }

  createForm() {
    const formContainer = document.createElement("div");
    formContainer.classList.add("formContainer");

    const form = document.createElement("form");
    form.classList.add("form");
    form.addEventListener("submit", (e) => this.emit(eventNames.submit, e));

    const input = document.createElement("input");
    input.setAttribute("type", "text");
    input.setAttribute("id", "input");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("placeholder", "What needs to be done?");
    input.setAttribute("autofocus", true);
    input.classList.add("input");

    const buttonSelectAll = document.createElement("button");
    buttonSelectAll.setAttribute("type", "button");
    buttonSelectAll.textContent = "❯";
    buttonSelectAll.classList.add("btnSelectAll");
    buttonSelectAll.addEventListener("click", () =>
      this.emit(eventNames.selectAll)
    );

    form.appendChild(buttonSelectAll);
    form.appendChild(input);

    formContainer.appendChild(form);

    return formContainer;
  }

  createCounterUnfulfilledTodo() {
    const counter = document.createElement("span");
    counter.classList.add("todoCounter");
    counter.textContent = "0 item left";
    return counter;
  }

  createBtnClear() {
    const btn = document.createElement("button");
    btn.classList.add("btnClear");
    btn.textContent = "Clear completed";
    btn.addEventListener("click", () => this.emit(eventNames.clearCompleted));
    return btn;
  }

  createSortButtonList() {
    const btnItems = [
      { id: "buttonAll", name: "All", eventName: eventNames.btnSelectAll },
      {
        id: "butttonActive",
        name: "Active",
        eventName: eventNames.btnSelectActive,
      },
      {
        id: "buttonCompleted",
        name: "Completed",
        eventName: eventNames.btnSelectCompleted,
      },
    ].map(({ id, name, eventName }) => {
      const li = document.createElement("li");

      const button = document.createElement("button");
      button.setAttribute("type", "button");
      button.setAttribute("id", id);
      button.textContent = name;
      button.classList.add("sortButton");
      button.addEventListener("click", () => this.emit(eventName));

      li.appendChild(button);
      return li;
    });

    const ul = document.createElement("ul");
    ul.classList.add("sortButtonList");
    ul.append(...btnItems);
    return ul;
  }

  createErrorNotice(message) {
    const notice = document.createElement("div");
    notice.classList.add("error");
    notice.classList.add("hidden");
    notice.textContent = message;
    return notice;
  }

  createSuccesNotice(message) {
    const notice = document.createElement("div");
    notice.classList.add("succes");
    notice.classList.add("hidden");
    notice.textContent = message;
    return notice;
  }

  createBtnLogout() {
    const btn = document.createElement("button");
    btn.classList.add("btnLogout");
    // btn.textContent = "Logout";
    btn.addEventListener("click", () => this.emit(eventNames.btnLogout));
    return btn;
  }

  createHelloTitle() {
    const title = document.createElement("h2");
    title.classList.add("titleHello");
    title.textContent = "Hello";
    return title;
  }
}

class RegistrationPage extends EventEmitter {
  elements = null;
  constructor(rootRef, handlers) {
    super();
    this.rootElement = rootRef;

    const elemenstInit = new ElementsForAuth(handlers);
    this.elements = {
      container: elemenstInit.createContainer("container"),
      title: elemenstInit.createTitle("log up"),
      form: elemenstInit.createForm({
        textContentForRedirectBtn: "Log In",
        route: routes.login,
      }),
      errorNotice: elemenstInit.createErrorNotice(
        ' "Oops..! Something went wrong"'
      ),
    };
  }

  go() {
    this.createMarcup();
  }

  createMarcup() {
    const { container, title, form, errorNotice } = this.elements;

    container.appendChild(title);
    container.appendChild(form);
    container.appendChild(errorNotice);
    this.rootElement.appendChild(container);
  }
}

class LoginPage extends EventEmitter {
  elements = null;
  constructor(rootRef, handlers) {
    super();
    this.rootElement = rootRef;

    const elemenstInit = new ElementsForAuth(handlers);
    this.elements = {
      container: elemenstInit.createContainer("container"),
      title: elemenstInit.createTitle("log in"),
      form: elemenstInit.createForm({
        textContentForRedirectBtn: "Log Up",
        route: routes.logup,
      }),
      errorNotice: elemenstInit.createErrorNotice(
        ' "Oops..! Something went wrong"'
      ),
    };
  }

  go() {
    this.createMarcup();
  }

  createMarcup() {
    const { container, title, form, errorNotice } = this.elements;

    container.appendChild(title);
    container.appendChild(form);
    container.appendChild(errorNotice);
    this.rootElement.appendChild(container);
  }
}

class ElementsForAuth extends EventEmitter {
  constructor({ onRedirect, onRegistration, onAuthorization }) {
    super();

    this.on(eventNames.btnRedirectInForm, onRedirect);
    this.on(eventNames.submitRegistration, onRegistration);
    this.on(eventNames.submitAuthorization, onAuthorization);
  }

  createContainer(className) {
    const container = document.createElement("div");
    container.classList.add(className);
    return container;
  }

  createTitle(title) {
    const h1 = document.createElement("h1");
    h1.textContent = title;
    h1.classList.add("title");
    return h1;
  }

  createForm({ textContentForRedirectBtn, route }) {
    const form = document.createElement("form");
    form.classList.add("authForm");
    form.addEventListener("submit", (e) => {
      if (route !== routes.logup) {
        this.emit(eventNames.submitRegistration, e);
        return;
      }
      this.emit(eventNames.submitAuthorization, e);
    });

    const inputLogin = document.createElement("input");
    inputLogin.setAttribute("type", "text");
    inputLogin.setAttribute("id", "login");
    inputLogin.setAttribute("autocomplete", "off");
    inputLogin.setAttribute("placeholder", "Enter login");
    inputLogin.classList.add("input");

    const inputPassword = document.createElement("input");
    inputPassword.setAttribute("type", "password");
    inputPassword.setAttribute("id", "password");
    inputPassword.setAttribute("autocomplete", "off");
    inputPassword.setAttribute("placeholder", "Enter password");
    inputPassword.classList.add("input");

    const submitBtn = document.createElement("button");
    submitBtn.setAttribute("type", "submit");
    submitBtn.classList.add("authButton");
    submitBtn.textContent = "Submit";

    const redirectBtn = document.createElement("button");
    redirectBtn.setAttribute("type", "button");
    redirectBtn.classList.add("authButton");
    redirectBtn.dataset.route = route;
    redirectBtn.textContent = textContentForRedirectBtn;
    redirectBtn.addEventListener("click", (e) =>
      this.emit(eventNames.btnRedirectInForm, e)
    );

    form.appendChild(inputLogin);
    form.appendChild(inputPassword);
    form.appendChild(submitBtn);
    form.appendChild(redirectBtn);

    return form;
  }

  createErrorNotice(message) {
    const notice = document.createElement("div");
    notice.classList.add("error");
    notice.classList.add("hidden");
    notice.textContent = message;
    return notice;
  }
}

const app = new App(document.getElementById("root"));
app.start();
