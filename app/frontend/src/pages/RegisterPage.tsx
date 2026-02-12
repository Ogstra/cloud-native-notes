import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

type RegisterForm = { email: string; username: string; password: string };

export default function RegisterPage() {
    const { register, handleSubmit, setError, formState: { errors } } = useForm<RegisterForm>();
    const { login } = useAuth();
    const navigate = useNavigate();

    const onSubmit = async (data: RegisterForm) => {
        try {
            const res = await api.post('/auth/register', data);
            login(res.data.access_token, res.data.user);
            navigate('/');
        } catch {
            setError('root', { message: 'Registration failed. Email might be taken.' });
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-100">
            <h1 className="text-4xl font-bold text-gray-900">OGS Notes</h1>
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Register</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input
                            {...register('username', { required: true })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            type="text"
                        />
                        {errors.username && <p className="text-xs text-red-500">Username is required</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            {...register('email', { required: true })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            type="email"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            {...register('password', { required: true, minLength: 6 })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            type="password"
                        />
                        {errors.password && <p className="text-xs text-red-500">Min 6 chars</p>}
                    </div>
                    {errors.root && <p className="text-red-500 text-sm">{errors.root.message as string}</p>}
                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition"
                    >
                        Create Account
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
                </p>
            </div>
        </div>
    );
}
