result = []  
for l in lines:  
    if l.strip() == 'import os':  
        if not seen:  
            result.append(l)  
            seen = True  
        continue  
    else:  
        seen = False  
    result.append(l)  
open('Backend/graphs/graph_service.py','w',encoding='utf-8').writelines(result)  
print('Done')  
