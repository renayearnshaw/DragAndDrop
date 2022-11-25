interface Draggable {
  dragStartHandler(event: DragEvent): void;
  dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
  dragOverHandler(event: DragEvent): void;
  dropHandler(event: DragEvent): void;
  dragLeaveHandler(event: DragEvent): void;
}

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
    this.updateListeners();
  }

  moveProject(projectId: string, newStatus: ProjectStatus) {
    const project = this.projects.find((project) => project.id === projectId);
    if (project && project.status !== newStatus) {
      project.status = newStatus;
      // Notify all listeners that a new project has been moved
      this.updateListeners();
    }
  }

  private updateListeners() {
    // Notify all listeners that a project has been added or moved
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

class ProjectItem
  extends Component<HTMLUListElement, HTMLLIElement>
  implements Draggable
{
  get peopleText() {
    if (this.project.people === 1) {
      return '1 person assigned';
    } else {
      return `${this.project.people} people assigned`;
    }
  }

  constructor(hostId: string, private project: Project) {
    super('single-project', hostId, 'afterbegin', project.id);

    this.configure();
    this.renderContent();
  }

  @autobind
  dragStartHandler(event: DragEvent): void {
    event.dataTransfer!.setData('text/plain', this.project.id);
    event.dataTransfer!.effectAllowed = 'move';
  }

  dragEndHandler(_: DragEvent): void {
    console.log('DragEnd');
  }

  protected renderContent(): void {
    this.element.querySelector('h2')!.textContent = this.project.title;
    this.element.querySelector('h3')!.textContent = this.peopleText;
    this.element.querySelector('p')!.textContent = this.project.description;
  }

  protected configure() {
    this.element.addEventListener('dragstart', this.dragStartHandler);
    this.element.addEventListener('dragend', this.dragEndHandler);
  }
}

class ProjectList
  extends Component<HTMLDivElement, HTMLElement>
  implements DragTarget
{
  private listId: string;
  assignedProjects: Project[];

  constructor(private type: ProjectStatus) {
    super('project-list', 'app', 'beforeend', `${type}-projects`);
    this.assignedProjects = [];
    this.listId = `${this.type}-projects-list`;

    this.configure();
    this.renderContent();
  }

  @autobind
  dragOverHandler(event: DragEvent): void {
    if (event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
      // Dropping is only allowed if we disable the default - which is to prevent dropping
      event.preventDefault();
      const listEl = this.element.querySelector('ul')!;
      // Change the appearance of the project list to show it's a drop target
      listEl.classList.add('droppable');
    }
  }

  @autobind
  dropHandler(event: DragEvent) {
    const projectId = event.dataTransfer!.getData('text/plain');
    projectState.moveProject(
      projectId,
      this.type === ProjectStatus.Active
        ? ProjectStatus.Active
        : ProjectStatus.Finished
    );
  }

  @autobind
  dragLeaveHandler(event: DragEvent): void {
    const listEl = this.element.querySelector('ul')!;
    // Change the appearance of the project list to show it's no longer a drop target
    listEl.classList.remove('droppable');
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
    this.element.addEventListener('dragover', this.dragOverHandler);
    this.element.addEventListener('dragleave', this.dragLeaveHandler);
    this.element.addEventListener('drop', this.dropHandler);
  }

  protected renderContent() {
    this.element.querySelector('ul')!.id = this.listId;
    this.element.querySelector('h2')!.textContent =
      this.type.toUpperCase() + ' PROJECTS';
  }

  private renderProjects() {
    const listEl = document.getElementById(
      `${this.listId}`
    )! as HTMLUListElement;
    // Clear out the list before recreating it with the new list of projects
    listEl.innerHTML = '';
    // Add all projects into the list
    for (const project of this.assignedProjects) {
      new ProjectItem(this.listId, project);
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
