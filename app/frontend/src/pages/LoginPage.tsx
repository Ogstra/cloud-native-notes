import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

type LoginForm = { email: string; password: string };

export default function LoginPage() {
    const { register, handleSubmit, setError, formState: { errors } } = useForm<LoginForm>();
    const { login } = useAuth();
    const navigate = useNavigate();

    const onSubmit = async (data: LoginForm) => {
        try {
            const res = await api.post('/auth/login', data);
            login(res.data.access_token, res.data.user);
            navigate('/');
        } catch {
            setError('root', { message: 'Invalid credentials' });
        }
    };

    const handleGuestLogin = async () => {
        try {
            const res = await api.post('/auth/guest');
            login(res.data.access_token, res.data.user);
            navigate('/');
        } catch {
            setError('root', { message: 'Failed to create guest session' });
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-100">
            <h1 className="text-4xl font-bold text-gray-900">OGS Notes</h1>
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Login</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email or Username</label>
                        <input
                            {...register('email', { required: true })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            type="text"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            {...register('password', { required: true })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            type="password"
                        />
                    </div>
                    {errors.root && <p className="text-red-500 text-sm">{errors.root.message as string}</p>}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={handleGuestLogin}
                        className="w-full bg-emerald-600 text-white py-3 px-4 rounded-md text-lg font-semibold hover:bg-emerald-700 transition"
                    >
                        Invitado
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Don't have an account? <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
                </p>
            </div>
        </div>
    );
}
