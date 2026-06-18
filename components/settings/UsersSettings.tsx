import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

const fetchUsers = async (): Promise<AppUser[]> => {
   const res = await fetch('/api/users');
   if (!res.ok) throw new Error('Failed to fetch users');
   const data = await res.json();
   return data.users;
};

type NewUserForm = { username: string; email: string; password: string; role: 'admin' | 'viewer' };

const emptyForm: NewUserForm = { username: '', email: '', password: '', role: 'viewer' };

const apiCall = async (method: string, body: object) => {
   const res = await fetch('/api/users', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
   });
   if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
   return res.json();
};

const UsersSettings = () => {
   const queryClient = useQueryClient();
   const [showAdd, setShowAdd] = useState(false);
   const [form, setForm] = useState<NewUserForm>(emptyForm);
   const [editingPassword, setEditingPassword] = useState<{ ID: number; password: string } | null>(null);
   const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

   const { data: users = [], isLoading } = useQuery('users', fetchUsers);

   const createMutation = useMutation(
      (data: NewUserForm) => apiCall('POST', data),
      {
         onSuccess: () => {
            queryClient.invalidateQueries('users');
            setForm(emptyForm);
            setShowAdd(false);
            toast.success('User created');
         },
         onError: (e: Error) => { toast.error(e.message); },
      },
   );

   const updateRoleMutation = useMutation(
      ({ ID, role }: { ID: number; role: string }) => apiCall('PUT', { ID, role }),
      {
         onSuccess: () => { queryClient.invalidateQueries('users'); toast.success('Role updated'); },
         onError: (e: Error) => { toast.error(e.message); },
      },
   );

   const updatePasswordMutation = useMutation(
      ({ ID, password }: { ID: number; password: string }) => apiCall('PUT', { ID, password }),
      {
         onSuccess: () => {
            queryClient.invalidateQueries('users');
            setEditingPassword(null);
            toast.success('Password updated');
         },
         onError: (e: Error) => { toast.error(e.message); },
      },
   );

   const deleteMutation = useMutation(
      (ID: number) => apiCall('DELETE', { ID }),
      {
         onSuccess: () => {
            queryClient.invalidateQueries('users');
            setConfirmDelete(null);
            toast.success('User deleted');
         },
         onError: (e: Error) => { toast.error(e.message); },
      },
   );

   const inputStyle = 'w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500';
   const labelStyle = 'block text-xs font-semibold text-gray-600 mb-1';

   const handlePasswordToggle = (userID: number) => {
      setEditingPassword(editingPassword?.ID === userID ? null : { ID: userID, password: '' });
   };

   const handleRoleChange = (userID: number, role: string) => {
      updateRoleMutation.mutate({ ID: userID, role });
   };

   return (
      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
         <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-gray-700">Users ({users.length})</h4>
            <button
               onClick={() => setShowAdd(!showAdd)}
               className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
               {showAdd ? 'Cancel' : '+ Add User'}
            </button>
         </div>

         {showAdd && (
            <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
               <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                     <label className={labelStyle}>Username</label>
                     <input
                        className={inputStyle}
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                     />
                  </div>
                  <div>
                     <label className={labelStyle}>Email</label>
                     <input
                        className={inputStyle}
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                     />
                  </div>
                  <div>
                     <label className={labelStyle}>Password</label>
                     <input
                        className={inputStyle}
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                     />
                  </div>
                  <div>
                     <label className={labelStyle}>Role</label>
                     <select
                        className={inputStyle}
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'viewer' })}
                     >
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                     </select>
                  </div>
               </div>
               <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.username || !form.password || createMutation.isLoading}
                  className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
               >
                  {createMutation.isLoading ? 'Creating...' : 'Create'}
               </button>
            </div>
         )}

         {isLoading && <p className="text-xs text-gray-500">Loading...</p>}

         <div className="space-y-2">
            {users.map((user) => (
               <div key={user.ID} className="border border-gray-200 rounded p-3 bg-white">
                  <div className="flex justify-between items-start">
                     <div>
                        <p className="text-sm font-semibold text-gray-800">{user.username}</p>
                        {user.email && <p className="text-xs text-gray-500">{user.email}</p>}
                     </div>
                     <div className="flex items-center gap-2">
                        <select
                           className="text-xs border border-gray-300 rounded px-1 py-0.5"
                           value={user.role}
                           onChange={(e) => handleRoleChange(user.ID, e.target.value)}
                        >
                           <option value="viewer">Viewer</option>
                           <option value="admin">Admin</option>
                        </select>
                        <button
                           onClick={() => handlePasswordToggle(user.ID)}
                           className="text-xs px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
                        >
                           Password
                        </button>
                        {confirmDelete === user.ID ? (
                           <span className="flex items-center gap-1">
                              <button
                                 onClick={() => deleteMutation.mutate(user.ID)}
                                 className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                 Confirm
                              </button>
                              <button
                                 onClick={() => setConfirmDelete(null)}
                                 className="text-xs px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
                              >
                                 Cancel
                              </button>
                           </span>
                        ) : (
                           <button
                              onClick={() => setConfirmDelete(user.ID)}
                              className="text-xs px-2 py-0.5 border border-red-300 text-red-600 rounded hover:bg-red-50"
                           >
                              Delete
                           </button>
                        )}
                     </div>
                  </div>
                  {editingPassword?.ID === user.ID && (
                     <div className="flex gap-2 mt-2">
                        <input
                           type="password"
                           placeholder="New password"
                           className={`${inputStyle} flex-1`}
                           value={editingPassword.password}
                           onChange={(e) => setEditingPassword({ ...editingPassword, password: e.target.value })}
                        />
                        <button
                           onClick={() => updatePasswordMutation.mutate({ ID: user.ID, password: editingPassword.password })}
                           disabled={!editingPassword.password || updatePasswordMutation.isLoading}
                           className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                           Save
                        </button>
                     </div>
                  )}
               </div>
            ))}
         </div>
      </div>
   );
};

export default UsersSettings;
