'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, UserCheck, UserX } from 'lucide-react';

interface Employee {
  _id: string;
  full_name: string;
  email: string;
  department_id: {
    _id: string;
    name: string;
  };
}

interface User {
  _id: string;
  email: string;
  full_name: string;
  department_id: {
    _id: string;
    name: string;
  };
  employee_id?: {
    _id: string;
    full_name: string;
  };
  role: 'SUPERADMIN' | 'ADMIN' | 'USER';
  isActive: boolean;
  lastLogin?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    employee_id: '',
    role: 'USER' as 'SUPERADMIN' | 'ADMIN' | 'USER',
    department_id: '',
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    email: '',
    full_name: '',
    role: 'USER' as 'SUPERADMIN' | 'ADMIN' | 'USER',
    department_id: '',
    isActive: true,
  });

  useEffect(() => {
    fetchUsers();
    fetchAvailableEmployees();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      const result = await apiClient.getUsers();
      if (result.success) {
        setUsers(result.data || []);
      } else {
        console.error('Error fetching users:', result.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEmployees = async () => {
    try {
      const result = await apiClient.getAvailableEmployees();
      if (result.success) {
        setAvailableEmployees(result.data || []);
      } else {
        console.error('Error fetching available employees:', result.error);
      }
    } catch (error) {
      console.error('Error fetching available employees:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const result = await apiClient.getDepartments();
      if (result.success) {
        setDepartments(result.data || []);
      } else {
        console.error('Error fetching departments:', result.error);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await apiClient.createUser(formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'User created successfully',
        });
        setIsCreateDialogOpen(false);
        setFormData({ email: '', password: '', full_name: '', employee_id: '', role: 'USER', department_id: '' });
        fetchUsers();
        fetchAvailableEmployees();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to create user',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create user',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const result = await apiClient.deleteUser(userId);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'User deleted successfully',
        });
        fetchUsers();
        fetchAvailableEmployees();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete user',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete user',
      });
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const result = await apiClient.updateUser(userId, { isActive: !currentStatus });

      if (result.success) {
        toast({
          title: 'Success',
          description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
        });
        fetchUsers();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update user',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user',
      });
    }
  };

  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department_id: user.department_id._id,
      isActive: user.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const result = await apiClient.updateUser(selectedUser._id, editFormData);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'User updated successfully',
        });
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update user',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update user',
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-red-500 text-white';
      case 'ADMIN':
        return 'bg-blue-500 text-white';
      case 'USER':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="employee_id">Select Employee</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => {
                    const employee = availableEmployees.find(emp => emp._id === value);
                    setFormData({ 
                      ...formData, 
                      employee_id: value,
                      full_name: employee?.full_name || '',
                      department_id: employee?.department_id._id || '',
                      email: employee?.email || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((employee) => (
                      <SelectItem key={employee._id} value={employee._id}>
                        {employee.full_name} - {employee.department_id.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'SUPERADMIN' | 'ADMIN' | 'USER') => 
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_full_name">Full Name</Label>
                <Input
                  id="edit_full_name"
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_department">Department</Label>
                <Select
                  value={editFormData.department_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, department_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_role">Role</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value: 'SUPERADMIN' | 'ADMIN' | 'USER') => 
                    setEditFormData({ ...editFormData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_isActive"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="edit_isActive">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Update User
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department_id.name}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.lastLogin 
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                      >
                        {user.isActive ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </Button>
                      {user.role !== 'SUPERADMIN' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
