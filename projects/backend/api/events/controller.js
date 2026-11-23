import Event from './model.js';
import { createCrudController } from '../../helpers/crud.js';

export default createCrudController(Event, {
  searchFields: ['title', 'description'],
  allowedFilters: ['type', 'status'],
  publishedField: 'status',
  publishedValue: 'published',
  populate: ['workIds', 'memberIds'],
  entity: 'Event',
  sort: { startAt: -1 }
});
