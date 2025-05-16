import os
from PIL import Image
from io import BytesIO
from django.core.files import File
from django.core.exceptions import ValidationError

def validate_image_file(file):
    # Maximum file size (5MB)
    max_size = 5 * 1024 * 1024  
    
    if file.size > max_size:
        raise ValidationError('File size must be no more than 5MB')
    

    valid_extensions = ['.jpg', '.jpeg', '.png', '.gif']
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in valid_extensions:
        raise ValidationError('Unsupported file extension')

def compress_image(image):

    try:
        im = Image.open(image)
        
        if im.mode != 'RGB':
            im = im.convert('RGB')
        
        max_size = (800, 800)
        if im.size[0] > max_size[0] or im.size[1] > max_size[1]:
            im.thumbnail(max_size, Image.LANCZOS)
        
        output = BytesIO()
        
        im.save(output, format='JPEG', quality=85, optimize=True)
        
        original_name = os.path.splitext(image.name)[0]
        new_name = f"{original_name}_compressed.jpg"
        
        output.seek(0)
        
        return File(output, name=new_name)
    
    except Exception as e:
        print(f"Error compressing image: {str(e)}")
        return image 