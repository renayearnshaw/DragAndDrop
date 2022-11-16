enum ProjectStatus {
  Active = 'active',
  Finished = 'finished',
}

class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public status: ProjectStatus
  ) {}
}

type Listener<T> = (items: T[]) => void;

abstract class State<T> {
  protected listeners: Listener<T>[] = [];

  // Add a function to be notified whenever the application state changes
  // eg. when a new project is added to one of the lists
  addListener(listener: Listener<T>) {
    this.listeners.push(listener);
  }
}

class ProjectState extends State<Project> {
  private projects: Project[] = [];
  private static instance: ProjectState;

  // this is a singleton
  private constructor() {
    super();
  }

  static getInstance() {
    if (this.instance) {
      return this.instance;
    }
    this.instance = new ProjectState();
    return this.instance;
  }

  addProject(title: string, description: string, people: number) {
    const newProject = new Project(
      Math.random().toString(),
      title,
      description,
      people,
      ProjectStatus.Active
    );
    this.projects.push(newProject);
    // Notify all listeners that a new project has been added
    for (const listener of this.listeners) {
      // pass a copy of the original array - we don't want the listeners
      // to be able to alter it
      listener(this.projects.slice());
    }
  }
}

// Create the singleton that manages the application state
const projectState = ProjectState.getInstance();

interface Validatable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

function validate(input: Validatable) {
  let isValid = true;
  if (input.required) {
    isValid = isValid && input.value.toString().trim().length !== 0;
  }
  if (input.minLength != null && typeof input.value === 'string') {
    isValid = isValid && input.value.length > input.minLength;
  }
  if (input.maxLength != null && typeof input.value === 'string') {
    isValid = isValid && input.value.length < input.maxLength;
  }
  if (input.min != null && typeof input.value === 'number') {
    isValid = isValid && input.value > input.min;
  }
  if (input.max != null && typeof input.value === 'number') {
    isValid = isValid && input.value < input.max;
  }
  return isValid;
}

// autobind decorator
// When we bind a method to another object - such as an event - 'this' binds to the
// target of the object/event. The decorator overrides this, to ensure that 'this'
// in our method points to this class
function autobind(
  target: any,
  methodName: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  const adjustedDescriptor: PropertyDescriptor = {
    configurable: true,
    get() {
      const boundFn = originalMethod.bind(this);
      return boundFn;
    },
  };
  return adjustedDescriptor;
}

abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  hostElement: T;
  element: U;
  insertPosition: InsertPosition;

  constructor(
    templateId: string,
    hostId: string,
    insertPosition: InsertPosition,
    elementId?: string
  ) {
    this.templateElement = document.getElementById(
      templateId
    )! as HTMLTemplateElement;
    this.hostElement = document.getElementById(hostId)! as T;
    const importedContent = document.importNode(
      this.templateElement.content,
      true
    );
    this.insertPosition = insertPosition;
    this.element = importedContent.firstElementChild as U;
    if (elementId) {
      this.element.id = elementId;
    }
    this.attach();
  }

  protected abstract renderContent(): void;
  protected abstract configure(): void;

  private attach() {
    this.hostElement.insertAdjacentElement(this.insertPosition, this.element);
  }
}
class ProjectList extends Component<HTMLDivElement, HTMLElement> {
  assignedProjects: Project[];

  constructor(private type: ProjectStatus) {
    super('project-list', 'app', 'beforeend', `${type}-projects`);
    this.assignedProjects = [];

    this.configure();
    this.renderContent();
  }

  protected configure() {
    // Add a listener that will be notified of any application state -
    // eg. a new project being added - and will re-render the project list
    projectState.addListener((projects: Project[]) => {
      // Only render projects of the correct status
      this.assignedProjects = projects.filter((project) => {
        return project.status === this.type;
      });
      this.renderProjects();
    });
  }

  protected renderContent() {
    const listId = `${this.type}- projects-list`;
    this.element.querySelector('ul')!.id = listId;
    this.element.querySelector('h2')!.textContent =
      this.type.toUpperCase() + ' PROJECTS';
  }

  private renderProjects() {
    const listEl = document.getElementById(
      `${this.type}- projects-list`
    )! as HTMLUListElement;
    // Clear out the list before recreating it with the new list of projects
    listEl.innerHTML = '';
    // Add all projects into the list
    for (const project of this.assignedProjects) {
      const listItem = document.createElement('li');
      listItem.textContent = project.title;
      listEl.appendChild(listItem);
    }
  }
}

class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleInputElement: HTMLInputElement;
  descriptionInputElement: HTMLInputElement;
  peopleInputElement: HTMLInputElement;

  constructor() {
    // Set an element id to pull in formatting from the css file
    super('project-input', 'app', 'afterbegin', 'user-input');
    this.titleInputElement = this.element.querySelector(
      '#title'
    ) as HTMLInputElement;
    this.descriptionInputElement = this.element.querySelector(
      '#description'
    ) as HTMLInputElement;
    this.peopleInputElement = this.element.querySelector(
      '#people'
    ) as HTMLInputElement;

    this.configure();
  }

  protected configure() {
    this.element.addEventListener('submit', this.submitHandler);
  }

  protected renderContent(): void {}

  private processUserInput(): [string, string, number] | void {
    const title = this.titleInputElement.value;
    const description = this.descriptionInputElement.value;
    const people = this.peopleInputElement.value;

    const titleValidator: Validatable = {
      value: title,
      required: true,
    };
    const descriptionValidator: Validatable = {
      value: description,
      required: true,
      minLength: 5,
    };
    const peopleValidator: Validatable = {
      value: people,
      required: true,
      min: 1,
      max: 5,
    };

    if (
      !validate(titleValidator) ||
      !validate(descriptionValidator) ||
      !validate(peopleValidator)
    ) {
      alert('Invalid input, please try again');
      return;
    } else {
      return [title, description, +people];
    }
  }

  private clearInputs() {
    this.titleInputElement.value = '';
    this.descriptionInputElement.value = '';
    this.peopleInputElement.value = '';
  }

  @autobind
  private submitHandler(event: Event) {
    event.preventDefault();
    const userInput = this.processUserInput();
    if (Array.isArray(userInput)) {
      projectState.addProject(...userInput);
      this.clearInputs();
    }
  }
}

const projectInput = new ProjectInput();
const activeProjects = new ProjectList(ProjectStatus.Active);
const finishedProjects = new ProjectList(ProjectStatus.Finished);
