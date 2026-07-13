export type { Client, CreateClientDto, UpdateClientDto } from './model/types'
export { default as ClientAvatar } from './ui/ClientAvatar.vue'
export {
  useClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useRemoveClientMutation,
  useToggleFavoriteClientMutation,
} from './model/client.queries'
export {
  listClients,
  getClientById,
  createClient,
  updateClient,
  removeClient,
} from './api/clients.api'
