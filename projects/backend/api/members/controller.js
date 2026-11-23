import Member from './model.js';
import { createCrudController } from '../../helpers/crud.js';

export default createCrudController(Member, {
  searchFields: ['firstName', 'lastName', 'role'],
  allowedFilters: ['voiceType', 'isActive'],
  publicFilter: { isActive: true },
  sort: { createdAt: -1 }
});
