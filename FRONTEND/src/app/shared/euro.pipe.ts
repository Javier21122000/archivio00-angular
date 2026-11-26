import { Pipe, PipeTransform } from '@angular/core';
import { euro } from '../core/util/euro';

/** Uso nei template: {{ product.prezzo | euro }} */
@Pipe({ name: 'euro' })
export class EuroPipe implements PipeTransform {
  transform(value: number): string {
    return euro(value);
  }
}
