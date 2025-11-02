import { createTRPCRouter } from '@/server/trpc/trpc'
import { exampleRouter } from './example'
import { contactsRouter } from './contacts'
import { companiesRouter } from './companies'
import { dealsRouter } from './deals'
import { activitiesRouter } from './activities'
import { pipelinesRouter } from './pipelines'
import { organizationsRouter } from './organizations'
import { searchRouter } from './search'
import { savedViewsRouter } from './saved-views'
import { settingsRouter } from './settings'
import { dashboardRouter } from './dashboard'
import { photosRouter } from './photos'

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  contacts: contactsRouter,
  companies: companiesRouter,
  deals: dealsRouter,
  activities: activitiesRouter,
  pipelines: pipelinesRouter,
  organizations: organizationsRouter,
  search: searchRouter,
  savedViews: savedViewsRouter,
  settings: settingsRouter,
  dashboard: dashboardRouter,
  photos: photosRouter,
})

export type AppRouter = typeof appRouter
