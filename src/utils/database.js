import { supabase } from '../config/supabase.js';

export class DatabaseManager {
  // User Profile Methods
  async createUserProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([{
          user_id: userId,
          display_name: profileData.displayName,
          avatar: profileData.avatar,
          education: profileData.education,
          goals: profileData.goals,
          custom_goal: profileData.customGoal,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // File Storage Methods
  async uploadFile(userId, file, fileName) {
    try {
      const fileExt = fileName.split('.').pop();
      const filePath = `${userId}/${Date.now()}-${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('materials')
        .upload(filePath, file);

      if (error) throw error;
      return { success: true, filePath: data.path };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { success: false, error: error.message };
    }
  }

  async downloadFile(filePath) {
    try {
      const { data, error } = await supabase.storage
        .from('materials')
        .download(filePath);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error downloading file:', error);
      return { success: false, error: error.message };
    }
  }

  async getFileUrl(filePath) {
    try {
      const { data } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      return { success: true, url: data.publicUrl };
    } catch (error) {
      console.error('Error getting file URL:', error);
      return { success: false, error: error.message };
    }
  }

  // Materials Methods
  async saveMaterial(userId, materialData, filePath = null) {
    try {
      const { data, error } = await supabase
        .from('materials')
        .insert([{
          user_id: userId,
          name: materialData.name,
          type: materialData.type,
          size: materialData.size,
          subject: materialData.subject || 'untagged',
          file_path: filePath,
          uploaded_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving material:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserMaterials(userId) {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching materials:', error);
      return { success: false, error: error.message };
    }
  }

  async updateMaterialSubject(materialId, subject) {
    try {
      const { data, error } = await supabase
        .from('materials')
        .update({ subject })
        .eq('id', materialId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating material subject:', error);
      return { success: false, error: error.message };
    }
  }

  async updateMaterialName(materialId, name) {
    try {
      const { data, error } = await supabase
        .from('materials')
        .update({ name })
        .eq('id', materialId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating material name:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteMaterial(materialId) {
    try {
      // First get the material to find the file path
      const { data: material, error: fetchError } = await supabase
        .from('materials')
        .select('file_path')
        .eq('id', materialId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the file from storage if it exists
      if (material.file_path) {
        const { error: storageError } = await supabase.storage
          .from('materials')
          .remove([material.file_path]);
        
        if (storageError) {
          console.warn('Warning: Failed to delete file from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete the material record from database
      const { data, error } = await supabase
        .from('materials')
        .delete()
        .eq('id', materialId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting material:', error);
      return { success: false, error: error.message };
    }
  }

  // Projects Methods
  async saveProject(userId, projectData) {
    try {
      const insertData = {
        user_id: userId,
        name: projectData.name,
        subject: projectData.subject,
        material_ids: projectData.materialIds,
        actions: projectData.actions,
        created_at: new Date().toISOString()
      };

      // Add quiz settings if provided
      if (projectData.quizQuestionCount) {
        insertData.quiz_question_count = projectData.quizQuestionCount;
      }
      if (projectData.quizDifficulty) {
        insertData.quiz_difficulty = projectData.quizDifficulty;
      }

      const { data, error } = await supabase
        .from('projects')
        .insert([insertData])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error saving project:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProjects(userId) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching projects:', error);
      return { success: false, error: error.message };
    }
  }

  async getProjectById(projectId) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching project:', error);
      return { success: false, error: error.message };
    }
  }

  async updateProjectSummary(projectId, summaryContent) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ 
          summary_content: summaryContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating project summary:', error);
      return { success: false, error: error.message };
    }
  }

  async updateProjectQuiz(projectId, quizId) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ 
          quiz_id: quizId,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating project quiz:', error);
      return { success: false, error: error.message };
    }
  }

  async updateProjectFlashcards(projectId, flashcardsContent) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ 
          flashcards_content: flashcardsContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating project flashcards:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteProject(projectId) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting project:', error);
      return { success: false, error: error.message };
    }
  }

  // Quiz Methods
  async saveQuiz(userId, quizData) {
    try {
      const insertData = {
        user_id: userId,
        title: quizData.title,
        description: quizData.description,
        questions: quizData.questions,
        created_at: new Date().toISOString()
      };

      // Add quiz settings if provided
      if (quizData.questionCount) {
        insertData.question_count = quizData.questionCount;
      }
      if (quizData.difficulty) {
        insertData.difficulty = quizData.difficulty;
      }

      const { data, error } = await supabase
        .from('quizzes')
        .insert([insertData])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error saving quiz:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserQuizzes(userId) {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return { success: false, error: error.message };
    }
  }

  async getQuizById(quizId) {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching quiz:', error);
      return { success: false, error: error.message };
    }
  }

  // Progress Methods
  async saveQuizAttempt(userId, projectId, quizId, attemptData) {
    try {
      const { data, error } = await supabase
        .from('progress')
        .insert([{
          user_id: userId,
          project_id: projectId,
          quiz_id: quizId,
          answers: attemptData.answers || [],
          score: attemptData.score || 0,
          total_questions: attemptData.totalQuestions || 0,
          started_at: attemptData.startedAt || new Date().toISOString(),
          completed_at: attemptData.completedAt || null
        }])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      return { success: false, error: error.message };
    }
  }

  async updateQuizAttempt(attemptId, updatedData) {
    try {
      const updateData = {};
      
      if (updatedData.answers !== undefined) updateData.answers = updatedData.answers;
      if (updatedData.score !== undefined) updateData.score = updatedData.score;
      if (updatedData.totalQuestions !== undefined) updateData.total_questions = updatedData.totalQuestions;
      if (updatedData.completedAt !== undefined) updateData.completed_at = updatedData.completedAt;

      const { data, error } = await supabase
        .from('progress')
        .update(updateData)
        .eq('id', attemptId)
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error updating quiz attempt:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserQuizAttempts(userId, projectId, quizId) {
    try {
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .eq('quiz_id', quizId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
      return { success: false, error: error.message };
    }
  }

  async getQuizAttemptById(attemptId) {
    try {
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching quiz attempt:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserAllQuizAttempts(userId) {
    try {
      const { data, error } = await supabase
        .from('progress')
        .select(`
          *,
          projects(name, subject),
          quizzes(title)
        `)
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching all quiz attempts:', error);
      return { success: false, error: error.message };
    }
  }

  // Calendar Events Methods
  async saveEvent(userId, eventData) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([{
          user_id: userId,
          title: eventData.title,
          description: eventData.description,
          event_date: eventData.date,
          event_time: eventData.time,
          duration: eventData.duration,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving event:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserEvents(userId) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('event_date', { ascending: true });

      if (error) throw error;
      
      // Transform data to match expected format
      const transformedData = data?.map(event => ({
        ...event,
        date: event.event_date,
        time: event.event_time
      }));

      return { success: true, data: transformedData };
    } catch (error) {
      console.error('Error fetching events:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteEvent(eventId) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting event:', error);
      return { success: false, error: error.message };
    }
  }

  // To-Do Methods
  async saveTodo(userId, todoData) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{
          user_id: userId,
          task: todoData.task,
          completed: todoData.completed,
          priority: todoData.priority || 'medium',
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error saving todo:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserTodos(userId) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching todos:', error);
      return { success: false, error: error.message };
    }
  }

  async updateTodoStatus(todoId, completed) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .update({ completed })
        .eq('id', todoId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating todo:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteTodo(todoId) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting todo:', error);
      return { success: false, error: error.message };
    }
  }
}