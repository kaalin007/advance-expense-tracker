'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, X, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea, ScrollAreaScrollbar } from '@radix-ui/react-scroll-area'

const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  amount: z.string().min(1, 'Amount is required'),
  categoryId: z.string().min(1, 'Category is required'),
  isSplit: z.boolean().default(false),
})

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  color: z.string().min(1, 'Color is required'),
})

interface Category {
  id: string
  name: string
  color: string
}

interface Contact {
  id: string
  nickname?: string
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
}

interface Participant {
  email: string
  nickname?: string
}

interface ExpenseFormProps {
  categories: Category[]
  onExpenseCreated: () => void
  onCategoryCreated: () => void
  expense?: any
  onExpenseUpdated?: () => void
}

export function ExpenseForm({ categories, onExpenseCreated, onCategoryCreated, expense, onExpenseUpdated }: ExpenseFormProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [newParticipant, setNewParticipant] = useState({ email: '', nickname: '' })
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showContacts, setShowContacts] = useState(false)

  const isEditing = !!expense

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: expense?.title || '',
      description: expense?.description || '',
      amount: expense?.amount?.toString() || '',
      categoryId: expense?.categoryId || '',
      isSplit: expense?.isSplit || false,
    },
  })

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      color: '#3B82F6',
    },
  })

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const addParticipant = () => {
    if (newParticipant.email && !participants.some(p => p.email === newParticipant.email)) {
      setParticipants([...participants, { ...newParticipant }])
      setNewParticipant({ email: '', nickname: '' })
    }
  }

  const addContactAsParticipant = (contact: Contact) => {
    if (!participants.some(p => p.email === contact.user.email)) {
      setParticipants([...participants, {
        email: contact.user.email,
        nickname: contact.nickname || contact.user.name
      }])
    }
  }

  const removeParticipant = (email: string) => {
    setParticipants(participants.filter(p => p.email !== email))
  }

  const onSubmit = async (values: z.infer<typeof expenseSchema>) => {
    try {
      setLoading(true)
      const url = isEditing ? `/api/expenses/${expense.id}` : '/api/expenses'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          participants: values.isSplit ? participants : [],
        }),
      })

      if (response.ok) {
        if (isEditing) {
          onExpenseUpdated?.()
        } else {
          onExpenseCreated()
        }
        form.reset()
        setParticipants([])
      } else {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} expense`)
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} expense:`, error)
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} expense`)
    } finally {
      setLoading(false)
    }
  }

  const onCategorySubmit = async (values: z.infer<typeof categorySchema>) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        onCategoryCreated()
        categoryForm.reset()
        setIsAddingCategory(false)
        toast.success('Category created successfully!')
      } else {
        throw new Error('Failed to create category')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error('Failed to create category')
    }
  }

  return (
    <div className="space-y-6 overflow-y-scroll max-h-[80vh]">
      <div>
        <h2 className="text-2xl font-bold">{isEditing ? 'Edit Expense' : 'Add New Expense'}</h2>
        <p className="text-muted-foreground">
          {isEditing ? 'Update your expense details.' : 'Create a new expense and optionally split it with others.'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter expense title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Add a description..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                      </DialogHeader>
                      <Form {...categoryForm}>
                        <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                          <FormField
                            control={categoryForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter category name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={categoryForm.control}
                            name="color"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Color</FormLabel>
                                <FormControl>
                                  <Input type="color" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" className="w-full">
                            Create Category
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isEditing && (
            <FormField
              control={form.control}
              name="isSplit"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Split this expense</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Share this expense with other people
                    </p>
                  </div>
                </FormItem>
              )}
            />
          )}

          {form.watch('isSplit') && !isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Split With</CardTitle>
                <CardDescription>
                  Add people to split this expense with
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowContacts(!showContacts)}
                    className="flex-1"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {showContacts ? 'Hide Contacts' : 'Show My Contacts'}
                  </Button>
                </div>

                {showContacts && contacts.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select from contacts</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {contacts.map((contact) => (
                        <Button
                          key={contact.id}
                          type="button"
                          variant="ghost"
                          className="justify-start h-auto p-2"
                          onClick={() => addContactAsParticipant(contact)}
                        >
                          <div className="text-left">
                            <p className="font-medium">{contact.nickname || contact.user.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.user.email}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="Email address"
                    value={newParticipant.email}
                    onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                  />
                  <Input
                    placeholder="Nickname (optional)"
                    value={newParticipant.nickname}
                    onChange={(e) => setNewParticipant({ ...newParticipant, nickname: e.target.value })}
                  />
                  <Button type="button" onClick={addParticipant} variant="outline">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                {participants.length > 0 && (
                  <div className="space-y-2">
                    <Label>Participants</Label>
                    <div className="space-y-2">
                      {participants.map((participant, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{participant.nickname || participant.email}</p>
                            {participant.nickname && (
                              <p className="text-sm text-muted-foreground">{participant.email}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeParticipant(participant.email)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Expense' : 'Create Expense')}
          </Button>
        </form>
      </Form>
    </div>
  )
}