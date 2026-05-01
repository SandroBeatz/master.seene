export type { Client, CreateClientDto, UpdateClientDto } from './model/types'
export {
  useClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useRemoveClientMutation,
} from './model/client.queries'
export {
  listClients,
  getClientById,
  createClient,
  updateClient,
  removeClient,
} from './api/clients.api'
