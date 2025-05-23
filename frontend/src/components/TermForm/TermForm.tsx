import React, { useState } from 'react';
import api from '../../services/api';
import '../../styles/dictionary.css';

const TermForm = () => {
    const [word, setWord] = useState('');
    const [definition, setDefinition] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const normalizedKey = word.trim().toLowerCase();
            await api.put('/', { 
                data: {
                    key: normalizedKey,
                    value: definition
                }
            });
            setMessage('success: Palavra e definição salvas com sucesso!');
            setWord('');
            setDefinition('');
        } catch (error) {
            setMessage('error: Erro ao salvar a definição da palavra.');
        }
    };

    const handleDelete = async () => {
        try {
            const normalizedKey = word.trim().toLowerCase();
            await api.delete(`/?key=${normalizedKey}`);
            setMessage('success: Palavra excluída com sucesso!');
            setWord('');
            setDefinition('');
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.erro || 'Erro ao excluir a palavra.';
            setMessage(`error: ${errorMessage}`);
        }
    };

    return (
        <div className="term-form">
            <h2>📝 Adicionar/Editar Palavra</h2>
            <form onSubmit={handleSubmit}>
                <input
                    placeholder="Digite uma palavra..."
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    required
                />
                <textarea
                    placeholder="Escreva a definição..."
                    value={definition}
                    onChange={(e) => setDefinition(e.target.value)}
                    rows={4}
                    required
                />
                <div className="button-group">
                    <button type="submit">💾 Salvar palavra</button>
                    <button 
                        type="button"
                        onClick={handleDelete}
                        className="btn-delete"
                        disabled={!word}
                    >
                        🗑️ Excluir palavra
                    </button>
                </div>
                {message && (
                    <div 
                        className="message"
                        data-success={message.startsWith('success') ? '' : undefined}
                        data-error={message.startsWith('error') ? '' : undefined}
                    >
                        {message.split(': ')[1]}
                    </div>
                )}
            </form>
        </div>
    );
};

export default TermForm;
