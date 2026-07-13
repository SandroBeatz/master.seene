export interface ServiceCategory {
  id: string
  name: string
}

export interface CreateServiceCategoryDto {
  name: string
}

export type UpdateServiceCategoryDto = CreateServiceCategoryDto & { id: string }
