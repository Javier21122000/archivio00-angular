/**
 * jsdom non implementa <dialog>.showModal()/close(): nei test li simuliamo
 * (basta l'attributo "open"; focus trap e backdrop sono comportamento del browser).
 */
export function stubDialog(): void {
  const proto = HTMLDialogElement.prototype;
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}
