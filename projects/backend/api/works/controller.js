import Work from './model.js';
import { createCrudController } from '../../helpers/crud.js';

export default createCrudController(Work, {
  searchFields: ['title', 'composer'],
  allowedFilters: ['category', 'language'],
  tagFilter: true,
  publishedField: 'isPublished',
  publishedValue: true,
  entity: 'Work'
});
