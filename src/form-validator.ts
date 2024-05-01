export class FormValidator {
  form: HTMLFormElement;
  fields: string[];

  constructor(form: HTMLFormElement, fields: string[]) {
    this.form = form;
    this.fields = fields;
  }

  initialize() {
    this.validateOnEntry();
    this.validateOnSubmit();
  }

  validateOnSubmit() {
    let self = this;

    const fakeSubmitButton = this.form.querySelector('#fake-submit') as HTMLInputElement;

    fakeSubmitButton.addEventListener('click', () => {
      let valid = true;
      self.fields.forEach(field => {
        const input = document.querySelector<HTMLInputElement>(`#${field}`);
        if (input) {
          if (!self.validateFields(input)) {
            valid = false;
          }
        }
      });
      if (valid) {
        (self.form.querySelector('input[type="submit"]') as HTMLInputElement).click()
      }
    });
  }

  validateOnEntry() {
    let self = this;
    this.fields.forEach(field => {
      const input = document.querySelector<HTMLInputElement>(`#${field}`);
      if (input) {
        input.addEventListener('input', () => {
          self.validateFields(input);
        });
      }
    });
  }

  validateFields(field: HTMLInputElement) {

    // Check presence of values
    if (field.value.trim() === '') {
      this.setStatus(field, `${(field.previousElementSibling as HTMLLabelElement).innerText} cannot be blank`, 'error');
      return false;
    }

    // check for a valid email address
    if (field.type === 'email') {
      const re = /\S+@\S+\.\S+/;
      if (!re.test(field.value)) {
        this.setStatus(field, 'Please enter valid email address', 'error');
        return false;
      }
    }

    this.setStatus(field, null, 'success');
    return true;
  }

  setStatus(field: HTMLInputElement, message: string | null, status: string) {
    const errorMessage = field.parentElement!.querySelector<HTMLElement>('.error-message') as HTMLElement;

    if (status === 'success') {
      errorMessage.innerText = '';
      field.classList.remove('input-error');
    }

    if (status === 'error') {
      errorMessage.innerText = message || '';
      field.classList.add('input-error');
    }
  }
}
