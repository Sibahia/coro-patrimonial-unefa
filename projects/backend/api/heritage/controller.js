import HeritageItem from './model.js';
import { createCrudController } from '../../helpers/crud.js';

export default createCrudController(HeritageItem, {
  searchFields: ['title', 'description'],
  allowedFilters: ['type'],
  tagFilter: true,
  yearFilter: true,
  featuredFilter: true,
  publishedField: 'isPublished',
  publishedValue: true,
  entity: 'HeritageItem'
});
